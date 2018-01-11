import { previewable, PreviewableIterable } from 'previewable-iterator';
import { match } from '../util';
import * as t from '../lexer/token';
import {
  Node,
  NodeConstructor,
  Literal,
  IntLit,
  FloatLit,
  StrLit,
  BoolLit,
  CharLit,
  Program,
  Import,
  Ident,
  Decl,
  ImportElem,
  Type,
  SimpleType,
  IntType,
  FloatType,
  StrType,
  BoolType,
  CharType,
  VoidType,
  Expr,
  LitExpr,
  ListType,
  TupleType,
  FuncType,
  PrimUnaryExpr,
  UnaryOp,
  PrimExpr,
  UnaryExpr,
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

  const decls = manyWhile(input, parseDecl, token =>
    token.is(t.Keyword, 'let'),
  );

  // should be the end
  consume(input, t.EOF);

  return { imports, decls };
});

const parseImport: Parser<Import> = parseNode(Import, input => {
  consume(input, t.Keyword, 'import');

  const path = StrLit.from(consume(input, t.StrLit) as t.StrLit);

  consume(input, t.Punctuation, '(');

  const elems: Array<ImportElem> = commaSeparated(input, input => {
    const name = parseIdent(input);
    let as_: Ident | null = null;
    if (nextToken(input).is(t.Keyword, 'as')) {
      consume(input, t.Keyword, 'as');
      as_ = parseIdent(input);
    }
    return { name, as: as_ };
  });

  consume(input, t.Punctuation, ')');

  return { path, elems };
});

const parseIdent: Parser<Ident> = parseNode(
  Ident,
  input => consume(input, t.Ident).rep,
);

const parseDecl: Parser<Decl> = parseNode(Decl, input => {
  consume(input, t.Keyword, 'let');

  const name = parseIdent(input);

  let type_: Type<any> | null = null;
  if (nextToken(input).is(t.Punctuation, ':')) {
    consume(input, t.Punctuation, ':');
    type_ = parseType(input);
  }

  consume(input, t.Punctuation, '=');

  const expr = parseExpr(input);

  return { name, type: type_, expr };
});

function parseType(input: ParserInput): Type<any> {
  let type_: Type<any>;

  const token = nextToken(input);
  if (token.is(t.Punctuation, '[')) {
    type_ = parseListType(input);
  } else if (token.is(t.Punctuation, '(')) {
    type_ = parseTupleType(input);
  } else if (token.is(t.Ident)) {
    type_ = parseSimpleType(input);
  } else {
    throw new ParseError(
      token.row,
      token.column,
      {
        name: token.constructor.name,
        rep: token.rep,
      },
      {
        name: 'Type',
      },
    );
  }

  if (nextToken(input).is(t.Punctuation, '->')) {
    return parseFuncType(input, type_);
  } else {
    return type_;
  }
}

const parseListType: Parser<ListType> = parseNode(ListType, input => {
  consume(input, t.Punctuation, '[');
  const elementType = parseType(input);
  consume(input, t.Punctuation, ']');
  return elementType;
});

const parseTupleType: Parser<TupleType> = parseNode(TupleType, input => {
  consume(input, t.Punctuation, '(');

  let items: Array<Type<any>> = [];
  if (!nextToken(input).is(t.Punctuation, ')')) {
    items = commaSeparated(input, parseType);
  }

  consume(input, t.Punctuation, ')');

  return { size: items.length, items };
});

function parseFuncType(input: ParserInput, lho: Type<any>): FuncType {
  consume(input, t.Punctuation, '->');
  return new FuncType(
    {
      param: lho,
      return: parseType(input),
    },
    lho.row,
    lho.column,
  );
}

function parseSimpleType(input: ParserInput): SimpleType {
  const ident = consume(input, t.Ident);
  return match(
    ident.rep,
    [
      ['int', () => new IntType(ident.row, ident.column)],
      ['float', () => new FloatType(ident.row, ident.column)],
      ['string', () => new StrType(ident.row, ident.column)],
      ['boolean', () => new BoolType(ident.row, ident.column)],
      ['char', () => new CharType(ident.row, ident.column)],
      ['void', () => new VoidType(ident.row, ident.column)],
    ],
    () => {
      throw new ParseError(ident.row, ident.column, {
        name: 'unknown type',
        rep: ident.rep,
      });
    },
  );
}

function parseLiteral(input: ParserInput): Literal<any> {
  const token = nextToken(input, true);
  return match<t.Literal<any>, Literal<any>>(
    token,
    [
      [token => token.is(t.IntLit), () => IntLit.from(token)],
      [token => token.is(t.FloatLit), () => FloatLit.from(token)],
      [token => token.is(t.StrLit), () => StrLit.from(token)],
      [token => token.is(t.BoolLit), () => BoolLit.from(token)],
      [token => token.is(t.CharLit), () => CharLit.from(token)],
    ],
    () => {
      throw new ParseError(
        token.row,
        token.column,
        {
          name: token.constructor.name,
          rep: token.rep,
        },
        {
          name: 'Literal',
        },
      );
    },
  );
}

function parseExpr(input: ParserInput): Expr<any> {
  // FIXME
  return parsePrimUnaryExpr(input);
}

function parsePrimUnaryExpr(input: ParserInput): PrimUnaryExpr<any> {
  if (UnaryOp.isUnaryOp(nextToken(input))) {
    return parseUnaryExpr(input);
  } else {
    return parsePrimExpr(input);
  }
}

const parseUnaryExpr: Parser<UnaryExpr> = parseNode(UnaryExpr, input => {
  const op = parseUnaryOp(input);
  const right = parsePrimUnaryExpr(input);
  return { op, right };
});

const parseUnaryOp: Parser<UnaryOp> = parseNode(UnaryOp, input => {
  const op = consume(input, t.Operator);
  if (op.rep === '+' || op.rep === '-' || op.rep === '!') {
    return op.rep;
  } else {
    throw new ParseError(
      op.row,
      op.column,
      {
        name: 'non-unary operator',
        rep: op.rep,
      },
      { name: 'unary operator' },
    );
  }
});

function parsePrimExpr(input: ParserInput): PrimExpr<any> {
  // FIXME
  return parseLitExpr(input);
}

const parseLitExpr: Parser<LitExpr> = parseNode(LitExpr, input =>
  parseLiteral(input),
);
