import { previewable, PreviewableIterable } from 'previewable-iterator';
import { Token, Ident } from './token';

export function* tokenize(raw: Iterable<string>): Iterable<Token<any>> {
  // make input previewable
  const input = previewable(raw);

  while (!input.preview().done) {
    yield parseToken(input);
  }
}

function parseToken(input: PreviewableIterable<string>): Token<any> {
  const { value } = input.next();

  // FIXME
  return new Ident(0, 0, value);
}
