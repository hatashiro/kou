import * as chalk from 'chalk';
import * as a from '../src/parser/ast';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugar } from '../src/desugarer/';
import {
  TypeContext,
  checkExprType,
  checkBlockType,
  typeEqual,
} from '../src/typechecker/';

console.log(chalk.bold('Running typechecker tests...'));

function exprTypeTest(
  exprStr: string,
  ctx: TypeContext,
  expectedType: a.Type<any>,
  shouldThrow?: string,
) {
  const moduleStr = `let x = ${exprStr}`;
  try {
    const mod = desugar(parse(tokenize(moduleStr)));
    const actualType = checkExprType(mod.value.decls[0].value.expr, ctx);
    typeEqual(actualType, expectedType);
  } catch (err) {
    if (
      shouldThrow &&
      err.name === 'TypeError' &&
      err.message.includes(shouldThrow)
    ) {
      return;
    }

    console.error(chalk.blue.bold('Test:'));
    console.error(exprStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

function blockTypeTest(
  blockStr: string,
  ctx: TypeContext,
  expectedType: a.Type<any>,
) {
  const moduleStr = `let x = fn () ${expectedType.name} ${blockStr}`;
  try {
    const mod = desugar(parse(tokenize(moduleStr)));
    const fn = mod.value.decls[0].value.expr as a.FuncExpr;
    const actualType = checkBlockType(fn.value.body, ctx);
    typeEqual(actualType, expectedType);
  } catch (err) {
    console.error(chalk.blue.bold('Test:'));
    console.error(blockStr);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

function ctx(obj: Array<{ [name: string]: a.Type<any> }> = []): TypeContext {
  const ctx = new TypeContext();
  for (const scopeObj of obj) {
    Object.keys(scopeObj).forEach(name =>
      ctx.push({ ident: new a.Ident(name, -1, -1), type: scopeObj[name] }),
    );
  }
  return ctx;
}

// literal
exprTypeTest('123', ctx(), new a.IntType(0, 0));
exprTypeTest('.123', ctx(), new a.FloatType(0, 0));
exprTypeTest('"hello, world"', ctx(), new a.StrType(0, 0));
exprTypeTest('true', ctx(), new a.BoolType(0, 0));
exprTypeTest('false', ctx(), new a.BoolType(0, 0));
exprTypeTest("'\\n'", ctx(), new a.CharType(0, 0));

// ident
exprTypeTest(
  'some_ident',
  ctx([{ some_ident: new a.IntType(-1, -1) }]),
  new a.IntType(-1, -1),
);
exprTypeTest(
  'some_ident',
  ctx([
    {},
    { other_ident: new a.FloatType(-1, -1) },
    { some_ident: new a.IntType(-1, -1) },
    {},
  ]),
  new a.IntType(-1, -1),
);
exprTypeTest(
  'some_ident',
  ctx([
    {},
    { one_ident: new a.IntType(-1, -1) },
    { some_ident: new a.StrType(-1, -1) },
    {},
  ]),
  new a.StrType(-1, -1),
);
exprTypeTest(
  'invalid_ident',
  ctx([
    {},
    { one_ident: new a.IntType(-1, -1) },
    { some_ident: new a.StrType(-1, -1) },
    {},
  ]),
  new a.StrType(-1, -1),
  'Semantic error: found undefined identifier invalid_ident',
);

// tuple
exprTypeTest(
  '(123, hello, true)',
  ctx([{ hello: new a.StrType(-1, -1) }]),
  new a.TupleType(
    {
      size: 3,
      items: [
        new a.IntType(-1, -1),
        new a.StrType(-1, -1),
        new a.BoolType(-1, -1),
      ],
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  '(123, hello, false)',
  ctx([{ hello: new a.StrType(-1, -1) }]),
  new a.TupleType(
    {
      size: 4,
      items: [
        new a.IntType(-1, -1),
        new a.StrType(-1, -1),
        new a.BoolType(-1, -1),
        new a.CharType(-1, -1),
      ],
    },
    -1,
    -1,
  ),
  'Tuple length mismatch: expected (int, str, bool, char), found (int, str, bool)',
);
exprTypeTest(
  '(1234, hello, true)',
  ctx([{ hello: new a.StrType(-1, -1) }]),
  new a.TupleType(
    {
      size: 3,
      items: [
        new a.IntType(-1, -1),
        new a.CharType(-1, -1),
        new a.BoolType(-1, -1),
      ],
    },
    -1,
    -1,
  ),
  'Type mismatch: expected (int, char, bool), found (int, str, bool)',
);

// list
exprTypeTest(
  '[1, 2, 3, 4]',
  ctx(),
  new a.ListType(new a.IntType(-1, -1), -1, -1),
);
exprTypeTest('[]', ctx(), new a.ListType(new a.IntType(-1, -1), -1, -1));
exprTypeTest('[]', ctx(), new a.ListType(new a.StrType(-1, -1), -1, -1));
exprTypeTest(
  '[[1], [2, 3, 4], []]',
  ctx(),
  new a.ListType(new a.ListType(new a.IntType(-1, -1), -1, -1), -1, -1),
);
exprTypeTest(
  '[some_ident, 4]',
  ctx([{ some_ident: new a.IntType(-1, -1) }]),
  new a.ListType(new a.IntType(-1, -1), -1, -1),
);
exprTypeTest(
  '[some_ident, 4]',
  ctx([{ some_ident: new a.IntType(-1, -1) }]),
  new a.ListType(new a.StrType(-1, -1), -1, -1),
  'Type mismatch: expected [str], found [int]',
);
exprTypeTest(
  '[some_ident, "str", 4]',
  ctx([{ some_ident: new a.IntType(-1, -1) }]),
  new a.ListType(new a.IntType(-1, -1), -1, -1),
  'Type mismatch: expected int, found str',
);

// function
exprTypeTest(
  'fn (a int) bool { true }',
  ctx(),
  new a.FuncType(
    {
      param: new a.IntType(-1, -1),
      return: new a.BoolType(-1, -1),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  'fn (a int, b str) bool { true }',
  ctx(),
  new a.FuncType(
    {
      param: new a.TupleType(
        {
          size: 2,
          items: [new a.IntType(-1, -1), new a.StrType(-1, -1)],
        },
        -1,
        -1,
      ),
      return: new a.BoolType(-1, -1),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  "fn (a int, b str) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  new a.FuncType(
    {
      param: new a.TupleType(
        {
          size: 2,
          items: [new a.IntType(-1, -1), new a.StrType(-1, -1)],
        },
        -1,
        -1,
      ),
      return: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  new a.FuncType(
    {
      param: new a.FuncType(
        {
          param: new a.StrType(-1, -1),
          return: new a.IntType(-1, -1),
        },
        -1,
        -1,
      ),
      return: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  "fn (a float, b str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  new a.FuncType(
    {
      param: new a.TupleType({
        size: 2,
        items: [
          new a.FloatType(-1, -1),
          new a.FuncType(
            {
              param: new a.StrType(-1, -1),
              return: new a.IntType(-1, -1),
            },
            -1,
            -1,
          ),
        ],
      }),
      return: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  'fn (a int, b str) bool { false }',
  ctx(),
  new a.FuncType(
    {
      param: new a.TupleType(
        {
          size: 2,
          items: [new a.CharType(-1, -1), new a.StrType(-1, -1)],
        },
        -1,
        -1,
      ),
      return: new a.BoolType(-1, -1),
    },
    -1,
    -1,
  ),
  'Type mismatch: expected (char, str) -> bool, found (int, str) -> bool',
);
exprTypeTest(
  "fn (a int, b str) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  new a.FuncType(
    {
      param: new a.TupleType(
        {
          size: 2,
          items: [new a.IntType(-1, -1), new a.StrType(-1, -1)],
        },
        -1,
        -1,
      ),
      return: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.BoolType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    -1,
    -1,
  ),
  'Type mismatch: expected (int, str) -> bool -> bool, found (int, str) -> bool -> char',
);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } }",
  ctx(),
  new a.FuncType(
    {
      param: new a.FuncType(
        {
          param: new a.StrType(-1, -1),
          return: new a.BoolType(-1, -1),
        },
        -1,
        -1,
      ),
      return: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    -1,
    -1,
  ),
  'Type mismatch: expected (str -> bool) -> bool -> char, found (str -> int) -> bool -> char',
);
exprTypeTest(
  'fn (a int) bool {}',
  ctx(),
  new a.FuncType(
    {
      param: new a.IntType(-1, -1),
      return: new a.BoolType(-1, -1),
    },
    -1,
    -1,
  ),
  'Function return type mismatch: expected bool, found void',
);
exprTypeTest(
  'fn (a int) bool { a }',
  ctx(),
  new a.FuncType(
    {
      param: new a.IntType(-1, -1),
      return: new a.BoolType(-1, -1),
    },
    -1,
    -1,
  ),
  'Function return type mismatch: expected bool, found int',
);
exprTypeTest(
  'fn (a int) void { a }',
  ctx(),
  new a.FuncType(
    {
      param: new a.IntType(-1, -1),
      return: new a.VoidType(-1, -1),
    },
    -1,
    -1,
  ),
  "Function return type mismatch, ';' may be missing: expected void, found int",
);
exprTypeTest(
  'fn (a int) void { a; }',
  ctx(),
  new a.FuncType(
    {
      param: new a.IntType(-1, -1),
      return: new a.VoidType(-1, -1),
    },
    -1,
    -1,
  ),
);

// call expr
exprTypeTest(
  'fn (a int, b int) int { a } (1, 2)',
  ctx(),
  new a.IntType(-1, -1),
);
exprTypeTest(
  'fn (a str) char { \'a\' } ("hello")',
  ctx(),
  new a.CharType(-1, -1),
);
exprTypeTest(
  "fn (a str -> int) bool -> char { fn (c bool) char { 'a' } } (fn (a str) int { 1 })",
  ctx(),
  new a.FuncType(
    {
      param: new a.BoolType(-1, -1),
      return: new a.CharType(-1, -1),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  'f1(f2)',
  ctx([
    {
      f1: new a.FuncType(
        {
          param: new a.FuncType(
            {
              param: new a.StrType(-1, -1),
              return: new a.BoolType(-1, -1),
            },
            -1,
            -1,
          ),
          return: new a.FuncType(
            {
              param: new a.BoolType(-1, -1),
              return: new a.CharType(-1, -1),
            },
            -1,
            -1,
          ),
        },
        -1,
        -1,
      ),
      f2: new a.FuncType(
        {
          param: new a.StrType(-1, -1),
          return: new a.BoolType(-1, -1),
        },
        -1,
        -1,
      ),
    },
  ]),
  new a.FuncType(
    {
      param: new a.BoolType(-1, -1),
      return: new a.CharType(-1, -1),
    },
    -1,
    -1,
  ),
);
exprTypeTest(
  '"i am not callable"(1, \'c\')',
  ctx(),
  new a.VoidType(-1, -1),
  'Semantic error: non-callable target: expected function, found str',
);
exprTypeTest(
  "fn (a int, b int) int { a } (1, 'c')",
  ctx(),
  new a.IntType(-1, -1),
  'Function parameter type mismatch: expected (int, int), found (int, char)',
);
exprTypeTest(
  "fn (a str) char { 'a' } (.123)",
  ctx(),
  new a.CharType(-1, -1),
  'Function parameter type mismatch: expected str, found float',
);

// block
blockTypeTest('{}', ctx(), new a.VoidType(-1, -1));
blockTypeTest(
  `
{
  let x = fn () int { x() };
  x()
}
`,
  ctx(),
  new a.IntType(-1, -1),
);
blockTypeTest(
  `
{
  f(123);
  let y = f(g);
  h(y)
}
`,
  ctx([
    {
      f: new a.FuncType(
        {
          param: new a.IntType(-1, -1),
          return: new a.BoolType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    { g: new a.IntType(-1, -1) },
    {
      h: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
  ]),
  new a.CharType(-1, -1),
);
blockTypeTest(
  `
{
  f(123);
  let y = f(g);
  h(y);
}
`,
  ctx([
    {
      f: new a.FuncType(
        {
          param: new a.IntType(-1, -1),
          return: new a.BoolType(-1, -1),
        },
        -1,
        -1,
      ),
    },
    { g: new a.IntType(-1, -1) },
    {
      h: new a.FuncType(
        {
          param: new a.BoolType(-1, -1),
          return: new a.CharType(-1, -1),
        },
        -1,
        -1,
      ),
    },
  ]),
  new a.VoidType(-1, -1),
);

// index expr
exprTypeTest(
  'list[3]',
  ctx([{ list: new a.ListType(new a.IntType(-1, -1), -1, -1) }]),
  new a.IntType(-1, -1),
);
exprTypeTest('"hello"[3]', ctx(), new a.CharType(-1, -1));
exprTypeTest('("hello", false, 123)[0]', ctx(), new a.StrType(-1, -1));
exprTypeTest('("hello", false, 123)[1]', ctx(), new a.BoolType(-1, -1));
exprTypeTest('("hello", false, 123)[2]', ctx(), new a.IntType(-1, -1));
exprTypeTest(
  '("hello", false, 123)[3]',
  ctx(),
  new a.VoidType(-1, -1),
  'Tuple index out of range: expected int < 3, found 3',
);
exprTypeTest(
  'list[no_int]',
  ctx([
    {
      list: new a.ListType(new a.IntType(-1, -1), -1, -1),
      no_int: new a.CharType(-1, -1),
    },
  ]),
  new a.IntType(-1, -1),
  'Index type mismatch: expected int, found char',
);
exprTypeTest(
  '"hello"[3]',
  ctx([{ no_int: new a.CharType(-1, -1) }]),
  new a.CharType(-1, -1),
  'Index type mismatch: expected int, found char',
);
exprTypeTest(
  '("hello", false, 123)[i]',
  ctx([{ i: new a.IntType(-1, -1) }]),
  new a.VoidType(-1, -1),
  'Invalid tuple index: only int literal is allowed for tuple index: found expr',
);
exprTypeTest(
  '("hello", false, 123)[no_int]',
  ctx([{ no_int: new a.CharType(-1, -1) }]),
  new a.VoidType(-1, -1),
  'Invalid tuple index: only int literal is allowed for tuple index: found expr',
);
exprTypeTest(
  '3[0]',
  ctx(),
  new a.VoidType(-1, -1),
  'Indexable type mismatch: expected list, str or tuple, found int',
);

console.log(chalk.green.bold('Passed!'));
