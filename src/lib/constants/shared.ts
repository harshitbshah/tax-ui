// Shared primitive types used across all country constants modules.

// A single bracket band: income from floor to ceiling (inclusive) is taxed at rate%.
// ceiling: Infinity represents "no upper limit" (top bracket).
export type BracketEntry = { floor: number; ceiling: number; rate: number };
