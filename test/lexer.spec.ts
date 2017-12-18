import * as chalk from 'chalk';
import { tokenize } from '../src/lexer';
import * as t from '../src/lexer/token';

type TokenExpectation = [Function, string];

function tokenEqual(token: t.Token<any>, [Con, rep]: TokenExpectation) {
  if (token instanceof Con && token.rep === rep) {
    // success
    return;
  }

  throw new Error(
    `Expected ${Con['name']}(${rep}), found ${token.constructor['name']}(${
      token.rep
    })`,
  );
}

function tokenizeTest(input: string, expectations: Array<TokenExpectation>) {
  try {
    for (const token of tokenize(input)) {
      tokenEqual(token, expectations.shift());
    }
  } catch (err) {
    console.error(chalk.blue.bold('Source:'));
    console.error(input);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

// FIXME
tokenizeTest('hello', [
  [t.Ident, 'h'],
  [t.Ident, 'e'],
  [t.Ident, 'l'],
  [t.Ident, 'l'],
  [t.Ident, 'o'],
]);

console.log(chalk.green.bold('Lexer tests passed'));
