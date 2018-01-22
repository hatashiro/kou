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

exprTypeTest('123', new TypeContext(), new a.IntType(0, 0));

console.log(chalk.green.bold('Typechecker tests passed'));
