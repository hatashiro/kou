import * as chalk from 'chalk';
import * as a from '../src/parser/ast';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugar } from '../src/desugarer/';
import { TypeContext, typeOf, typeEqual } from '../src/typechecker/';

function exprTypeTest(
  exprStr: string,
  ctx: TypeContext,
  expectedType: a.Type<any>,
) {
  const moduleStr = `let x = ${exprStr}`;
  const mod = desugar(parse(tokenize(moduleStr)));
  const actualType = typeOf(mod.value.decls[0].value.expr, ctx);
  try {
    typeEqual(expectedType, actualType);
  } catch (err) {
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

function shouldThrow(f: () => void, message: string) {
  try {
    f();
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes(message)) {
      return;
    }
    throw err;
  }
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
shouldThrow(
  () =>
    exprTypeTest(
      'invalid_ident',
      ctx([
        {},
        { some_ident: new a.IntType(-1, -1) },
        { some_ident: new a.StrType(-1, -1) },
        {},
      ]),
      new a.StrType(-1, -1),
    ),
  'undefined identifier invalid_ident',
);

console.log(chalk.green.bold('Typechecker tests passed'));
