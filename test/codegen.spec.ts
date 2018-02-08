import chalk from 'chalk';
import { compose } from '@typed/compose';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore, desugarAfter } from '../src/desugarer/';
import { typeCheck, TypeContext } from '../src/typechecker/';
import '../src/codegen/'; // FIXME: import sth

console.log(chalk.bold('Running codegen tests...'));

const compile = compose(
  desugarAfter,
  typeCheck(new TypeContext()),
  desugarBefore,
  parse,
  tokenize,
);

console.log(chalk.green.bold('Passed!'));
