export class LexError extends Error {
  name: string = 'LexError';

  constructor(
    public row: number,
    public column: number,
    public unexpected: string,
  ) {
    super(`Unexpected ${unexpected} at ${row}:${column}`);
  }
}
