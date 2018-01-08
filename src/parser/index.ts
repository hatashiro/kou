import { previewable, PreviewableIterable } from 'previewable-iterator';
import * as t from '../lexer/token';
import {
  Node,
  NodeConstructor,
  Literal,
  StrLit,
  Program,
  Import,
  Ident,
  Decl,
  ImportElem,
} from './ast';

type ParserInput = PreviewableIterable<t.Token<any>>;
type Parser<T> = (input: ParserInput) => T;

export function parse(tokens: Iterable<t.Token<any>>): Program {
  const input = previewable(tokens);
  return parseProgram(input);
}

function getNextToken(
  input: ParserInput,
  shouldConsume: boolean,
): t.Token<any> {
  if (input.preview().done) {
    throw new Error(`Unexpected end of token stream`);
  }

  const token = input.preview().value;
  if (token instanceof t.EOF) {
    throw new Error(`Unexpected end of input at ${token.row}:${token.column}`);
  }

  return shouldConsume ? input.next().value : token;
}

function parseNode<T>(
  Cons: NodeConstructor<T>,
  parser: Parser<T>,
): Parser<Node<T>> {
  return (input: ParserInput) => {
    const { row, column } = getNextToken(input, false);
    return new Cons(parser(input), row, column);
  };
}

function consume<T>(
  input: ParserInput,
  TokenCon: t.TokenConstructor<T>,
  rep?: T,
): t.Token<T> {
  const token = getNextToken(input, true);

  if (token.is(TokenCon, rep)) {
    return token;
  }

  throw new Error(
    `Expected ${TokenCon.name}(${rep || ''}), but found ${
      token.constructor.name
    }(${token.rep}) at ${token.row}:${token.column}`,
  );
}

function manyWhile<T>(
  input: ParserInput,
  parser: Parser<T>,
  whilst: (token: t.Token<any>) => boolean,
): Array<T> {
  const results: Array<T> = [];
  while (!input.preview().done && whilst(input.preview().value)) {
    results.push(parser(input));
  }
  return results;
}

function commaSeparated<T>(input: ParserInput, parser: Parser<T>): Array<T> {
  return [parser(input)].concat(
    manyWhile(
      input,
      input => consume(input, t.Punctuation, ',') && parser(input),
      token => token.is(t.Punctuation, ','),
    ),
  );
}

const parseProgram: Parser<Program> = parseNode(Program, input => {
  const imports = manyWhile(input, parseImport, token =>
    token.is(t.Keyword, 'import'),
  );

  // FIXME
  const decls: Array<Decl> = [];

  return { imports, decls };
});

const parseImport: Parser<Import> = parseNode(Import, input => {
  consume(input, t.Keyword, 'import');

  const path = StrLit.from(consume(input, t.StrLit) as t.StrLit);

  consume(input, t.Punctuation, '(');

  const elems: Array<ImportElem> = commaSeparated(input, input => {
    const ident = parseIdent(input);
    let alias: Ident | null = null;
    if (!input.preview().done && input.preview().value.is(t.Keyword, 'as')) {
      consume(input, t.Keyword, 'as');
      alias = parseIdent(input);
    }
    return { name: ident, as: alias };
  });

  consume(input, t.Punctuation, ')');

  return { path, elems };
});

const parseIdent: Parser<Ident> = parseNode(
  Ident,
  input => consume(input, t.Ident).rep,
);
