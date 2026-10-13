export type Difficulty = "easy" | "medium" | "hard";

export type Placement = {
  word: string;
  row: number;
  column: number;
  rowStep: number;
  columnStep: number;
};

export type Puzzle = {
  grid: string[][];
  placements: Placement[];
};

export const DIFFICULTIES: Record<
  Difficulty,
  { label: string; size: number; wordCount: number }
> = {
  easy: { label: "Easy", size: 10, wordCount: 8 },
  medium: { label: "Medium", size: 12, wordCount: 12 },
  hard: { label: "Hard", size: 15, wordCount: 16 },
};

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
] as const;

function normalizeWord(word: string): string {
  return word.replace(/[^a-z]/gi, "").toUpperCase();
}

export function generatePuzzle(
  inputWords: string[],
  difficulty: Difficulty,
  random: () => number = Math.random,
): Puzzle {
  const { size } = DIFFICULTIES[difficulty];
  const words = inputWords.map(normalizeWord);

  if (words.length === 0 || words.some((word) => word.length === 0)) {
    throw new Error("Add at least one word made up of letters.");
  }
  if (words.some((word) => word.length > size)) {
    throw new Error(`Words must be ${size} letters or fewer for this grid.`);
  }
  if (new Set(words).size !== words.length) {
    throw new Error("Each word must be unique.");
  }

  const orderedWords = [...words].sort((a, b) => b.length - a.length);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const grid: (string | null)[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => null),
    );
    const placements: Placement[] = [];
    let failed = false;

    for (const word of orderedWords) {
      let placed = false;

      for (let tryCount = 0; tryCount < 500 && !placed; tryCount += 1) {
        const [rowStep, columnStep] =
          DIRECTIONS[Math.floor(random() * DIRECTIONS.length)];
        const row = Math.floor(random() * size);
        const column = Math.floor(random() * size);
        const endRow = row + rowStep * (word.length - 1);
        const endColumn = column + columnStep * (word.length - 1);

        if (
          endRow < 0 ||
          endRow >= size ||
          endColumn < 0 ||
          endColumn >= size
        ) {
          continue;
        }

        let canPlace = true;
        for (let index = 0; index < word.length; index += 1) {
          const current = grid[row + rowStep * index][column + columnStep * index];
          if (current !== null && current !== word[index]) {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) continue;

        for (let index = 0; index < word.length; index += 1) {
          grid[row + rowStep * index][column + columnStep * index] = word[index];
        }
        placements.push({ word, row, column, rowStep, columnStep });
        placed = true;
      }

      if (!placed) {
        failed = true;
        break;
      }
    }

    if (failed) continue;

    return {
      grid: grid.map((row) =>
        row.map((letter) =>
          letter ?? String.fromCharCode(65 + Math.floor(random() * 26)),
        ),
      ),
      placements,
    };
  }

  throw new Error("Those words are tricky to fit. Try fewer or shorter words.");
}

export function findWordInSelection(
  grid: string[][],
  startIndex: number,
  endIndex: number,
  words: string[],
): string | null {
  const size = grid.length;
  const startRow = Math.floor(startIndex / size);
  const startColumn = startIndex % size;
  const endRow = Math.floor(endIndex / size);
  const endColumn = endIndex % size;
  const rowDistance = endRow - startRow;
  const columnDistance = endColumn - startColumn;

  if (rowDistance === 0 && columnDistance === 0) return null;
  if (rowDistance !== 0 && columnDistance !== 0 && Math.abs(rowDistance) !== Math.abs(columnDistance)) {
    return null;
  }

  const steps = Math.max(Math.abs(rowDistance), Math.abs(columnDistance));
  const rowStep = Math.sign(rowDistance);
  const columnStep = Math.sign(columnDistance);
  let selected = "";

  for (let step = 0; step <= steps; step += 1) {
    selected += grid[startRow + rowStep * step][startColumn + columnStep * step];
  }

  const target = selected.toUpperCase();
  return (
    words.find((word) => {
      const normalized = normalizeWord(word);
      return normalized === target || normalized === [...target].reverse().join("");
    }) ?? null
  );
}

export function getSelectionIndices(
  size: number,
  startIndex: number,
  endIndex: number,
): number[] {
  const startRow = Math.floor(startIndex / size);
  const startColumn = startIndex % size;
  const endRow = Math.floor(endIndex / size);
  const endColumn = endIndex % size;
  const rowDistance = endRow - startRow;
  const columnDistance = endColumn - startColumn;

  if (
    (rowDistance !== 0 && columnDistance !== 0 && Math.abs(rowDistance) !== Math.abs(columnDistance)) ||
    (rowDistance === 0 && columnDistance === 0)
  ) {
    return startIndex === endIndex ? [startIndex] : [];
  }

  const steps = Math.max(Math.abs(rowDistance), Math.abs(columnDistance));
  return Array.from(
    { length: steps + 1 },
    (_, step) =>
      (startRow + Math.sign(rowDistance) * step) * size +
      startColumn +
      Math.sign(columnDistance) * step,
  );
}
