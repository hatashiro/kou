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

export function parse(tokens: Iterable<t.Token<any>>): Program {
  const input = previewable(tokens);
  return parseProgram(input);
}

function nextToken(input: ParserInput, consume: boolean = false): t.Token<any> {
  if (!input.preview().value) {
    throw new ParseError(-1, -1, { name: 'end of token stream' });
  }
  return consume ? input.next().value : input.preview().value;
}

function parseNode<T>(
  Cons: NodeConstructor<T>,
  parser: Parser<T>,
): Parser<Node<T>> {
  return (input: ParserInput) => {
    const { row, column } = nextToken(input);
    return new Cons(parser(input), row, column);
  };
}

function consume<T>(
  input: ParserInput,
  TokenCon: t.TokenConstructor<T>,
  rep?: T,
): t.Token<T> {
  const token = nextToken(input, true);

  if (token.is(TokenCon, rep)) {
    return token;
  }

  throw new ParseError(
    token.row,
    token.column,
    { name: token.constructor.name, rep: token.rep },
    { name: TokenCon.name, rep: rep as any },
  );
}

function manyWhile<T>(
  input: ParserInput,
  parser: Parser<T>,
  whilst: (token: t.Token<any>) => boolean,
): Array<T> {
  const results: Array<T> = [];
  while (whilst(nextToken(input))) {
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

  // should be the end
  consume(input, t.EOF);

  return { imports, decls };
});

const parseImport: Parser<Import> = parseNode(Import, input => {
  consume(input, t.Keyword, 'import');

  const path = StrLit.from(consume(input, t.StrLit) as t.StrLit);

  consume(input, t.Punctuation, '(');

  const elems: Array<ImportElem> = commaSeparated(input, input => {
    const ident = parseIdent(input);
    let alias: Ident | null = null;
    if (nextToken(input).is(t.Keyword, 'as')) {
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
