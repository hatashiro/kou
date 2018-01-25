import * as chalk from 'chalk';
import * as a from '../src/parser/ast';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugar } from '../src/desugarer/';
import { TypeContext, typeOf, typeEqual } from '../src/typechecker/';

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
    const actualType = typeOf(mod.value.decls[0].value.expr, ctx);
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

function ctx(obj: Array<{ [key: string]: a.Type<any> }> = []): TypeContext {
  const ctx = new TypeContext();
  for (const scopeObj of obj) {
    Object.keys(scopeObj).forEach(key =>
      ctx.push({
        name: new a.Ident(key, -1, -1),
        type: scopeObj[key],
      }),
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
    { some_ident: new a.IntType(-1, -1) },
    { some_ident: new a.StrType(-1, -1) },
    {},
  ]),
  new a.StrType(-1, -1),
);
exprTypeTest(
  'invalid_ident',
  ctx([
    {},
    { some_ident: new a.IntType(-1, -1) },
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

// function (only check type, not body)
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
);
exprTypeTest(
  'fn (a int, b str) bool {}',
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
  'fn (a int, b str) bool -> char {}',
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
  'fn (a str -> int) bool -> char {}',
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
  'fn (a float, b str -> int) bool -> char {}',
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
  'fn (a int, b str) bool {}',
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
  'fn (a int, b str) bool -> char {}',
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
  'fn (a str -> int) bool -> char {}',
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

console.log(chalk.green.bold('Passed!'));
