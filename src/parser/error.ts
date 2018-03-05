export class ParseError extends Error {
  name: string = 'ParseError';

  constructor(
    public row: number,
    public column: number,
    public unexpected: { name: string; rep?: string },
    public expected?: { name: string; rep?: string },
  ) {
    super();

    const str = ({ name, rep }: { name: string; rep?: string }) =>
      name + (rep ? ` ${rep}` : '');

    let message = `Unexpected ${str(unexpected)} at ${row}:${column}`;
    if (expected) {
      message += `, expected ${str(expected)}`;
    }
    this.message = message;
  }
}
