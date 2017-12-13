import { Token, Punctuation } from './token';

export function tokenize(input: string): Array<Token<any>> {
  // FIXME
  return [new Punctuation(0, 0, '->')];
}
