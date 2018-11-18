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
  Module,
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
  ArrayType,
  TupleType,
  FuncType,
  PrimUnaryExpr,
  UnaryOp,
  PrimExpr,
  UnaryExpr,
  IdentExpr,
  TupleExpr,
  ArrayExpr,
  FuncExpr,
  Param,
  Block,
  BinaryOp,
  BinaryExpr,
  EqOp,
  CompOp,
  AddOp,
  MulOp,
  BoolOp,
  CallExpr,
  IndexExpr,
  CondExpr,
  LoopExpr,
  Assign,
  LVal,
} from './ast';
import { ParseError } from './error';

type ParserInput = PreviewableIterable<t.Token<any>>;
type Parser<T> = (input: ParserInput) => T;

export function parse(tokens: Iterable<t.Token<any>>): Module {
  const input = previewable(tokens);
  return parseModule(input);
}

function nextToken(input: ParserInput, consume: boolean = false): t.Token<any> {
  if (!input.preview().value) {
    throw new ParseError(-1, -1, { name: 'end of token stream' });
  }
  return consume ? input.next().value : input.preview().value;
}

function parseNode<T, N extends Node<T>>(
  Cons: NodeConstructor<T, N>,
  parser: Parser<T>,
): Parser<N> {
  return (input: ParserInput) => {
    const { row, column } = nextToken(input);
    return new Cons(parser(input), row, column);
  };
}

function consume<Tk extends t.Token<any>>(
  input: ParserInput,
  TokenCon: t.TokenConstructor<t.RepType<Tk>, Tk>,
  rep?: t.RepType<Tk>,
): Tk {
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

const parseModule: Parser<Module> = parseNode(Module, input => {
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
    type_ = parseArrayType(input);
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

const parseArrayType: Parser<ArrayType> = parseNode(ArrayType, input => {
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
      ['int', () => new IntType(null, ident.row, ident.column)],
      ['float', () => new FloatType(null, ident.row, ident.column)],
      ['str', () => new StrType(null, ident.row, ident.column)],
      ['bool', () => new BoolType(null, ident.row, ident.column)],
      ['char', () => new CharType(null, ident.row, ident.column)],
      ['void', () => new VoidType(null, ident.row, ident.column)],
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

function parseExpr(input: ParserInput, precedence: number = -1): Expr<any> {
  let left = parsePrimUnaryExpr(input);

  while (
    BinaryOp.isBinaryOp(nextToken(input)) &&
    tokenToBinaryOp(nextToken(input)).precedence > precedence
  ) {
    left = parseBinaryExpr(input, left, precedence);
  }

  return left;
}

function parsePrimUnaryExpr(input: ParserInput): PrimUnaryExpr<any> {
  const next = nextToken(input);
  if (UnaryOp.isUnaryOp(next)) {
    return parseUnaryExpr(input);
  } else {
    return parsePrimExpr(input);
  }
}

function parseBinaryExpr(
  input: ParserInput,
  left: Expr<any>,
  precedence: number = -1,
): BinaryExpr {
  const op = parseBinaryOp(input);
  const right = parseExpr(input, op.precedence);
  return new BinaryExpr({ op, left, right }, left.row, left.column);
}

function parseBinaryOp(input: ParserInput): BinaryOp<any> {
  const op = consume(input, t.Operator);
  return tokenToBinaryOp(op);
}

function tokenToBinaryOp(op: t.Operator): BinaryOp<any> {
  switch (op.rep) {
    case '==':
    case '!=':
      return new EqOp(op.rep, op.row, op.column);
    case '<':
    case '<=':
    case '>':
    case '>=':
      return new CompOp(op.rep, op.row, op.column);
    case '+':
    case '-':
    case '|':
    case '^':
      return new AddOp(op.rep, op.row, op.column);
    case '*':
    case '/':
    case '%':
    case '&':
      return new MulOp(op.rep, op.row, op.column);
    case '||':
    case '&&':
      return new BoolOp(op.rep, op.row, op.column);
    default:
      throw new ParseError(
        op.row,
        op.column,
        {
          name: 'non-binary operator',
          rep: op.rep,
        },
        {
          name: 'binary operator',
        },
      );
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
  const token = nextToken(input);
  let expr = match<t.Token<any>, PrimExpr<any>>(
    token,
    [
      [token => token instanceof t.Literal, () => parseLitExpr(input)],
      [token => token.is(t.Ident), () => parseIdentExpr(input)],
      [token => token.is(t.Punctuation, '('), () => parseTupleExpr(input)],
      [token => token.is(t.Punctuation, '['), () => parseArrayExpr(input)],
      [token => token.is(t.Keyword, 'fn'), () => parseFuncExpr(input)],
      [token => token.is(t.Keyword, 'if'), () => parseCondExpr(input)],
      [token => token.is(t.Keyword, 'for'), () => parseLoopExpr(input)],
    ],
    () => {
      throw new ParseError(token.row, token.column, {
        name: token.constructor.name,
        rep: token.rep,
      });
    },
  );

  while (nextToken(input).is(t.Punctuation)) {
    if (nextToken(input).is(t.Punctuation, '(')) {
      expr = parseCallExpr(input, expr);
    } else if (nextToken(input).is(t.Punctuation, '[')) {
      expr = parseIndexExpr(input, expr);
    } else {
      break;
    }
  }

  return expr;
}

const parseLitExpr: Parser<LitExpr> = parseNode(LitExpr, parseLiteral);

const parseIdentExpr: Parser<IdentExpr> = parseNode(IdentExpr, parseIdent);

const parseTupleExpr: Parser<TupleExpr> = parseNode(TupleExpr, input => {
  consume(input, t.Punctuation, '(');
  let items: Array<Expr<any>> = [];
  if (!nextToken(input).is(t.Punctuation, ')')) {
    items = commaSeparated(input, parseExpr);
  }
  consume(input, t.Punctuation, ')');
  return { size: items.length, items };
});

const parseArrayExpr: Parser<ArrayExpr> = parseNode(ArrayExpr, input => {
  consume(input, t.Punctuation, '[');
  let elems: Array<Expr<any>> = [];
  if (!nextToken(input).is(t.Punctuation, ']')) {
    elems = commaSeparated(input, parseExpr);
  }
  consume(input, t.Punctuation, ']');
  return elems;
});

function parseCallExpr(input: ParserInput, func: PrimExpr<any>): CallExpr {
  const args = parseTupleExpr(input);
  return new CallExpr({ func, args }, func.row, func.column);
}

function parseIndexExpr(input: ParserInput, target: PrimExpr<any>): IndexExpr {
  consume(input, t.Punctuation, '[');
  const index = parseExpr(input);
  consume(input, t.Punctuation, ']');
  return new IndexExpr({ target, index }, target.row, target.column);
}

const parseFuncExpr: Parser<FuncExpr> = parseNode(FuncExpr, input => {
  consume(input, t.Keyword, 'fn');

  consume(input, t.Punctuation, '(');
  let params: Array<Param> = [];
  if (!nextToken(input).is(t.Punctuation, ')')) {
    params = commaSeparated(input, input => {
      const name = parseIdent(input);
      const type_ = parseType(input);
      return { name, type: type_ };
    });
  }
  consume(input, t.Punctuation, ')');

  const returnType = parseType(input);
  const body = parseBlock(input);

  return {
    params: {
      size: params.length,
      items: params,
    },
    returnType,
    body,
  };
});

const parseCondExpr: Parser<CondExpr> = parseNode(CondExpr, input => {
  consume(input, t.Keyword, 'if');
  const if_ = parseExpr(input);
  const then = parseBlock(input);
  consume(input, t.Keyword, 'else');
  const else_ = parseBlock(input);
  return { if: if_, then, else: else_ };
});

const parseLoopExpr: Parser<LoopExpr> = parseNode(LoopExpr, input => {
  consume(input, t.Keyword, 'for');
  const for_ = parseIdent(input);
  consume(input, t.Keyword, 'in');
  const in_ = parseExpr(input);
  const do_ = parseBlock(input);
  return { for: for_, in: in_, do: do_ };
});

const parseBlock: Parser<Block> = parseNode(Block, input => {
  consume(input, t.Punctuation, '{');

  let bodies: Array<Expr<any> | Decl | Assign> = [];
  let returnVoid = true;

  while (!nextToken(input).is(t.Punctuation, '}')) {
    if (nextToken(input).is(t.Keyword, 'let')) {
      bodies.push(parseDecl(input));
    } else {
      const expr = parseExpr(input);
      if (nextToken(input).is(t.Punctuation, '=')) {
        if (expr instanceof IdentExpr || expr instanceof IndexExpr) {
          bodies.push(parseAssign(input, expr));
        } else {
          throw new ParseError(expr.row, expr.column, expr, {
            name: 'LVal (IdentExpr or IndexExpr)',
          });
        }
      } else {
        bodies.push(expr);
      }
    }

    if (nextToken(input).is(t.Punctuation, ';')) {
      consume(input, t.Punctuation, ';');
      returnVoid = true;
    } else {
      returnVoid = false;
      break;
    }
  }

  consume(input, t.Punctuation, '}');

  return { bodies, returnVoid };
});

function parseAssign(input: ParserInput, lVal: LVal): Assign {
  consume(input, t.Punctuation, '=');
  const expr = parseExpr(input);
  return new Assign({ lVal, expr }, lVal.row, lVal.column);
}
