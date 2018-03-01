import chalk from 'chalk';
import { tokenize } from '../src/lexer/';
import { parse } from '../src/parser/';
import { desugarBefore, desugarAfter } from '../src/desugarer/';
import { typeCheck, TypeContext } from '../src/typechecker/';
import { genWASM } from '../src/codegen/';
import { Compose } from '../src/util';

console.log(chalk.bold('Running codegen tests...'));

const compile = Compose.then(tokenize)
  .then(parse)
  .then(desugarBefore)
  .then(typeCheck(new TypeContext()))
  .then(desugarAfter)
  .then(genWASM('test')).f;

console.log(chalk.green.bold('Passed!'));
