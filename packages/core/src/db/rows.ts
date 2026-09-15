/** Returns the first row, or throws if the query returned none. */
export function expectRow<T>(rows: T[], what: string): T {
  const [row] = rows;
  if (row === undefined) throw new Error(`Expected ${what}`);
  return row;
}

/** Returns the first row, or undefined when the query returned none. */
export function firstRow<T>(rows: T[]): T | undefined {
  return rows[0];
}
