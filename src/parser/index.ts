import { previewable, PreviewableIterable } from 'previewable-iterator';
import * as t from '../lexer/token';
import { Program } from './ast';

type ParserInput = PreviewableIterable<t.Token<any>>;

export function parse(tokens: Iterable<t.Token<any>>): Program {
  const input = previewable(tokens);
  return {} as any;
}
