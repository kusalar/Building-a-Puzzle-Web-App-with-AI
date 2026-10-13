import { describe, expect, it } from "vitest";
import {
  findWordInSelection,
  generatePuzzle,
  getSelectionIndices,
} from "./puzzle";

describe("generatePuzzle", () => {
  it("places each word in the grid and returns usable placements", () => {
    const puzzle = generatePuzzle(["CAT", "DOG", "BIRD"], "easy");

    expect(puzzle.grid).toHaveLength(10);
    expect(puzzle.grid.every((row) => row.length === 10)).toBe(true);
    expect(puzzle.placements.map(({ word }) => word).sort()).toEqual([
      "BIRD",
      "CAT",
      "DOG",
    ]);

    for (const { word, row, column, rowStep, columnStep } of puzzle.placements) {
      const placed = [...word]
        .map((_, index) => puzzle.grid[row + rowStep * index][column + columnStep * index])
        .join("");
      expect(placed).toBe(word);
    }
  });

  it("rejects invalid, duplicate, and oversized words", () => {
    expect(() => generatePuzzle([], "easy")).toThrow(/at least one word/i);
    expect(() => generatePuzzle(["CAT", "cat"], "easy")).toThrow(/unique/i);
    expect(() => generatePuzzle(["SUPERCALIFRAGILISTIC"], "easy")).toThrow(/10 letters/i);
  });
});

describe("findWordInSelection", () => {
  const grid = [
    ["C", "A", "T"],
    ["O", "G", "D"],
    ["B", "I", "R"],
  ];
  const diagonalGrid = [
    ["S", "X", "X"],
    ["X", "E", "X"],
    ["X", "X", "A"],
  ];

  it("finds horizontal and diagonal words in either direction", () => {
    expect(findWordInSelection(grid, 0, 2, ["CAT"])).toBe("CAT");
    expect(findWordInSelection(grid, 2, 0, ["CAT"])).toBe("CAT");
    expect(findWordInSelection(diagonalGrid, 0, 8, ["SEA"])).toBe("SEA");
    expect(findWordInSelection(diagonalGrid, 8, 0, ["SEA"])).toBe("SEA");
  });

  it("rejects bent paths and single-cell selections", () => {
    expect(findWordInSelection(grid, 0, 5, ["CAT"])).toBeNull();
    expect(findWordInSelection(grid, 0, 0, ["CAT"])).toBeNull();
  });
});

describe("getSelectionIndices", () => {
  it("returns straight and diagonal paths but not bent paths", () => {
    expect(getSelectionIndices(4, 0, 3)).toEqual([0, 1, 2, 3]);
    expect(getSelectionIndices(4, 0, 10)).toEqual([0, 5, 10]);
    expect(getSelectionIndices(4, 0, 6)).toEqual([]);
  });
});
