export class TypeError extends Error {
  name: 'TypeError' | 'SemanticError';
  row: number;
  column: number;

  constructor(
    public actual: { row: number; column: number; name: string },
    public expected?: { name: string },
    message: string = 'Type mismatch',
    name: 'TypeError' | 'SemanticError' = 'TypeError',
  ) {
    super(
      `${message}: ${expected ? `expected ${expected.name}, ` : ''}found ${
        actual.name
      } at ${actual.row}:${actual.column}`,
    );

    this.name = name;
    this.row = actual.row;
    this.column = actual.column;
  }
}
