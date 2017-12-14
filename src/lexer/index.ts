import { previewable } from 'previewable-iterator';
import { Token, Punctuation } from './token';

export function* tokenize(input: Iterable<string>): Iterable<Token<any>> {
  // make input previewable
  const charIter = previewable(input);

  for (const char of charIter) {
    console.log('current: ', char);
    console.log('next: ', charIter.preview().value);
  }

  return [new Punctuation(0, 0, '->')];
}
