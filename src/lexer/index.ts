import { Token, Punctuation } from './token';

export function* tokenize(input: Iterable<string>): Iterable<Token<any>> {
  // FIXME
  return [new Punctuation(0, 0, '->')];
}
