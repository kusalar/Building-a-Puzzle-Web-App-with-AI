import {
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  DIFFICULTIES,
  findWordInSelection,
  generatePuzzle,
  getSelectionIndices,
  type Difficulty,
  type Puzzle,
} from "./puzzle";

const THEMES = {
  "Garden party": [
    "GARDEN",
    "PETAL",
    "BLOOM",
    "TULIP",
    "ROSE",
    "DAISY",
    "VIOLET",
    "FERN",
    "BEE",
    "SEED",
    "VINE",
    "FLORA",
    "LILAC",
    "MOSS",
    "IRIS",
    "POPPY",
  ],
  "Cozy kitchen": [
    "COOKIE",
    "COCOA",
    "GINGER",
    "WAFFLE",
    "HONEY",
    "CINNAMON",
    "MUFFIN",
    "BREAD",
    "SUGAR",
    "LEMON",
    "BASIL",
    "PEPPER",
    "LATTE",
    "BERRY",
    "NOODLE",
    "OLIVE",
  ],
  "Outer space": [
    "PLANET",
    "COMET",
    "GALAXY",
    "ORBIT",
    "NEBULA",
    "ROCKET",
    "MOON",
    "STAR",
    "COSMOS",
    "METEOR",
    "LUNAR",
    "ASTRO",
    "SATURN",
    "VENUS",
    "SOLAR",
    "ECLIPSE",
  ],
  "Ocean friends": [
    "DOLPHIN",
    "CORAL",
    "OCTOPUS",
    "SEAHORSE",
    "TURTLE",
    "WHALE",
    "SHELL",
    "ANCHOR",
    "REEF",
    "PEARL",
    "STARFISH",
    "JELLY",
    "SHARK",
    "LAGOON",
    "CLAM",
    "KELP",
  ],
};

type GameRound = {
  puzzle: Puzzle;
  words: string[];
  title: string;
};

function parseCustomWords(value: string, difficulty: Difficulty): string[] {
  const entries = value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const { size, wordCount } = DIFFICULTIES[difficulty];

  if (entries.length < 3) {
    throw new Error("Add at least 3 words to make a custom puzzle.");
  }
  if (entries.length > wordCount) {
    throw new Error(`This difficulty supports up to ${wordCount} custom words.`);
  }

  const words = entries.map((word) => {
    if (!/^[a-z]+(?:[ -][a-z]+)*$/i.test(word)) {
      throw new Error("Use letters only, with spaces or hyphens between words.");
    }
    return word.replace(/[ -]/g, "").toUpperCase();
  });

  if (words.some((word) => word.length > size)) {
    throw new Error(`Each word must fit in the ${size} × ${size} grid.`);
  }
  if (new Set(words).size !== words.length) {
    throw new Error("Please remove duplicate words from your list.");
  }
  return words;
}

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [theme, setTheme] = useState<keyof typeof THEMES>("Garden party");
  const [customMode, setCustomMode] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [error, setError] = useState("");
  const [round, setRound] = useState<GameRound>(() => {
    const words = THEMES["Garden party"].slice(0, DIFFICULTIES.easy.wordCount);
    return { puzzle: generatePuzzle(words, "easy"), words, title: "Garden party" };
  });
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [keyboardAnchor, setKeyboardAnchor] = useState<number | null>(null);
  const [celebration, setCelebration] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);

  const size = round.puzzle.grid.length;
  const foundSet = useMemo(() => new Set(foundWords), [foundWords]);
  const completed = foundWords.length === round.words.length;
  const foundCellSet = useMemo(() => {
    const indices = new Set<number>();
    for (const placement of round.puzzle.placements) {
      if (!foundSet.has(placement.word)) continue;
      for (let index = 0; index < placement.word.length; index += 1) {
        indices.add(
          (placement.row + placement.rowStep * index) * size +
            placement.column +
            placement.columnStep * index,
        );
      }
    }
    return indices;
  }, [foundSet, round.puzzle.placements, size]);
  const selectedCells = useMemo(
    () =>
      selection
        ? new Set(getSelectionIndices(size, selection.start, selection.end))
        : new Set<number>(),
    [selection, size],
  );

  function startNewGame(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setError("");
    setCelebration(false);
    try {
      const words = customMode
        ? parseCustomWords(customInput, difficulty)
        : THEMES[theme].slice(0, DIFFICULTIES[difficulty].wordCount);
      const puzzle = generatePuzzle(words, difficulty);
      setRound({ puzzle, words, title: customMode ? "Your own words" : theme });
      setFoundWords([]);
      setSelection(null);
      setKeyboardAnchor(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create that puzzle.");
    }
  }

  function finishSelection(start: number, end: number) {
    const match = findWordInSelection(
      round.puzzle.grid,
      start,
      end,
      round.words.filter((word) => !foundSet.has(word)),
    );
    if (match) {
      setFoundWords((current) => {
        if (current.includes(match)) return current;
        const next = [...current, match];
        if (next.length === round.words.length) setCelebration(true);
        return next;
      });
      setError("");
    }
  }

  function cellAtPoint(clientX: number, clientY: number): number | null {
    const element = document.elementFromPoint(clientX, clientY);
    const cell = element?.closest<HTMLElement>("[data-cell-index]");
    if (!cell || !boardRef.current?.contains(cell)) return null;
    const index = Number(cell.dataset.cellIndex);
    return Number.isInteger(index) ? index : null;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const index = cellAtPoint(event.clientX, event.clientY);
    if (index === null) return;
    event.preventDefault();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelection({ start: index, end: index });
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== event.pointerId || !selection) return;
    const index = cellAtPoint(event.clientX, event.clientY);
    if (index !== null) setSelection({ ...selection, end: index });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (activePointer.current !== event.pointerId || !selection) return;
    const end = cellAtPoint(event.clientX, event.clientY) ?? selection.end;
    const { start } = selection;
    activePointer.current = null;
    setSelection(null);
    finishSelection(start, end);
  }

  function handleCellKeyDown(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (keyboardAnchor === null) {
      setKeyboardAnchor(index);
      setSelection({ start: index, end: index });
      return;
    }
    setSelection(null);
    finishSelection(keyboardAnchor, index);
    setKeyboardAnchor(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Word Search Studio home">
          <span className="brand-icon" aria-hidden="true">✳</span>
          <span>little word club</span>
        </a>
        <span className="top-note">A cozy brain break, just for you</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <span className="eyebrow"><span aria-hidden="true">✦</span> THE DAILY DAYDREAM</span>
        <h1 id="page-title">A little word<br /><span>search.</span></h1>
        <p>Take a deep breath, find a few lovely words, and let your mind wander.</p>
      </section>

      <section className="game-layout" aria-label="Word search game">
        <div className="game-card">
          <div className="game-card-header">
            <div>
              <span className="section-kicker">YOUR PUZZLE</span>
              <h2>{round.title}</h2>
            </div>
            <div className="progress-pill" aria-live="polite">
              <span className="progress-dot" aria-hidden="true" />
              {foundWords.length} <span className="progress-divider">/</span> {round.words.length} found
            </div>
          </div>

          <div
            ref={boardRef}
            className={`letter-grid grid-${size}`}
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            role="grid"
            aria-label={`${size} by ${size} word search puzzle`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              activePointer.current = null;
              setSelection(null);
            }}
          >
            {round.puzzle.grid.flatMap((row, rowIndex) =>
              row.map((letter, columnIndex) => {
                const index = rowIndex * size + columnIndex;
                const isFound = foundCellSet.has(index);
                const isSelected = selectedCells.has(index);
                return (
                  <button
                    key={index}
                    className={`grid-letter${isFound ? " is-found" : ""}${isSelected ? " is-selected" : ""}`}
                    type="button"
                    role="gridcell"
                    data-cell-index={index}
                    aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}: ${letter}`}
                    aria-pressed={isFound || isSelected}
                    onKeyDown={(event) => handleCellKeyDown(index, event)}
                  >
                    {letter}
                  </button>
                );
              }),
            )}
          </div>

          <div className="board-hint">
            <span className="hint-sparkle" aria-hidden="true">✧</span>
            Drag across a word in any direction to find it
          </div>
          {celebration && (
            <div className="completion-message" role="status">
              <span aria-hidden="true">🎉</span> Lovely work — you found them all!
            </div>
          )}
        </div>

        <aside className="side-panel">
          <div className="word-card">
            <div className="word-card-heading">
              <div>
                <span className="section-kicker">WORD LIST</span>
                <h2>Find these</h2>
              </div>
              <span className="list-flower" aria-hidden="true">❋</span>
            </div>
            <ul className="word-list" aria-label="Words to find">
              {round.words.map((word) => (
                <li key={word} className={foundSet.has(word) ? "word-found" : ""}>
                  <span className="word-check" aria-hidden="true">{foundSet.has(word) ? "✓" : ""}</span>
                  <span>{word}</span>
                </li>
              ))}
            </ul>
            <div className="word-list-footer">
              <span className="footer-flower" aria-hidden="true">✿</span>
              <span>{completed ? "You did it!" : "Take your time"}</span>
              <span className="footer-flower" aria-hidden="true">✿</span>
            </div>
          </div>

          <form className="controls-card" onSubmit={startNewGame}>
            <div className="controls-heading">
              <span className="section-kicker">MAKE IT YOURS</span>
              <span className="controls-sparkle" aria-hidden="true">✦</span>
            </div>

            <fieldset className="source-options">
              <legend className="visually-hidden">Word source</legend>
              <label className={`source-choice${!customMode ? " active" : ""}`}>
                <input
                  type="radio"
                  name="source"
                  checked={!customMode}
                  onChange={() => {
                    setCustomMode(false);
                    setError("");
                  }}
                />
                <span aria-hidden="true">✿</span> Pick a theme
              </label>
              <label className={`source-choice${customMode ? " active" : ""}`}>
                <input
                  type="radio"
                  name="source"
                  checked={customMode}
                  onChange={() => {
                    setCustomMode(true);
                    setError("");
                  }}
                />
                <span aria-hidden="true">✎</span> My own words
              </label>
            </fieldset>

            {customMode ? (
              <label className="field-label" htmlFor="custom-words">
                Your words <span>3–{DIFFICULTIES[difficulty].wordCount}, one per line or comma-separated</span>
                <textarea
                  id="custom-words"
                  value={customInput}
                  onChange={(event) => setCustomInput(event.target.value)}
                  placeholder={"ORCHID, COMET, LANTERN"}
                  rows={3}
                />
              </label>
            ) : (
              <label className="field-label" htmlFor="theme">
                Choose a theme
                <select
                  id="theme"
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as keyof typeof THEMES)}
                >
                  {Object.keys(THEMES).map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
            )}

            <fieldset className="difficulty-field">
              <legend className="field-label">Difficulty</legend>
              <div className="difficulty-options">
                {(Object.keys(DIFFICULTIES) as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`difficulty-button${difficulty === level ? " active" : ""}`}
                    aria-pressed={difficulty === level}
                    onClick={() => {
                      setDifficulty(level);
                      setError("");
                    }}
                  >
                    {DIFFICULTIES[level].label}
                  </button>
                ))}
              </div>
            </fieldset>

            {error && <p className="error-message" role="alert">{error}</p>}
            <button className="new-game-button" type="submit">
              <span>New puzzle</span><span aria-hidden="true">↗</span>
            </button>
          </form>
        </aside>
      </section>

      <footer className="page-footer">
        <span>Made for slow mornings &amp; little pauses</span>
        <span className="footer-heart" aria-hidden="true">♡</span>
      </footer>
    </main>
  );
}

export default App;
