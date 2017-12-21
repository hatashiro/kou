import * as chalk from 'chalk';
import { tokenize } from '../src/lexer';
import * as t from '../src/lexer/token';

type TokenExpectation = [
  Function,
  string,
  number | undefined,
  number | undefined
];

function tokenEqual(
  token: t.Token<any>,
  [Con, rep, row, column]: TokenExpectation,
) {
  if (
    token instanceof Con &&
    token.rep === rep &&
    (typeof row === 'undefined' || token.row === row) &&
    (typeof column === 'undefined' || token.column === column)
  ) {
    // success
    return;
  }

  throw new Error(
    `Expected ${Con['name']}(${row}, ${column}, ${rep}), found ${
      token.constructor['name']
    }(${token.row}, ${token.column}, ${token.rep})`,
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

// Single token tests

tokenizeTest('->', [[t.Punctuation, '->', 1, 1]]);
tokenizeTest(',', [[t.Punctuation, ',', 1, 1]]);
tokenizeTest('(', [[t.Punctuation, '(', 1, 1]]);
tokenizeTest(')', [[t.Punctuation, ')', 1, 1]]);
tokenizeTest('[', [[t.Punctuation, '[', 1, 1]]);
tokenizeTest(']', [[t.Punctuation, ']', 1, 1]]);
tokenizeTest('{', [[t.Punctuation, '{', 1, 1]]);
tokenizeTest('}', [[t.Punctuation, '}', 1, 1]]);
tokenizeTest(':', [[t.Punctuation, ':', 1, 1]]);
tokenizeTest('=', [[t.Punctuation, '=', 1, 1]]);
tokenizeTest(';', [[t.Punctuation, ';', 1, 1]]);

tokenizeTest('+', [[t.Operator, '+', 1, 1]]);
tokenizeTest('-', [[t.Operator, '-', 1, 1]]);
tokenizeTest('!', [[t.Operator, '!', 1, 1]]);
tokenizeTest('==', [[t.Operator, '==', 1, 1]]);
tokenizeTest('!=', [[t.Operator, '!=', 1, 1]]);
tokenizeTest('<', [[t.Operator, '<', 1, 1]]);
tokenizeTest('<=', [[t.Operator, '<=', 1, 1]]);
tokenizeTest('>', [[t.Operator, '>', 1, 1]]);
tokenizeTest('>=', [[t.Operator, '>=', 1, 1]]);
tokenizeTest('|', [[t.Operator, '|', 1, 1]]);
tokenizeTest('^', [[t.Operator, '^', 1, 1]]);
tokenizeTest('*', [[t.Operator, '*', 1, 1]]);
tokenizeTest('/', [[t.Operator, '/', 1, 1]]);
tokenizeTest('%', [[t.Operator, '%', 1, 1]]);
tokenizeTest('&', [[t.Operator, '&', 1, 1]]);
tokenizeTest('||', [[t.Operator, '||', 1, 1]]);
tokenizeTest('&&', [[t.Operator, '&&', 1, 1]]);

tokenizeTest('1', [[t.IntLit, '1', 1, 1]]);
tokenizeTest('123', [[t.IntLit, '123', 1, 1]]);
tokenizeTest('1234567890', [[t.IntLit, '1234567890', 1, 1]]);
tokenizeTest('1010101010', [[t.IntLit, '1010101010', 1, 1]]);
tokenizeTest('01234', [[t.IntLit, '01234', 1, 1]]);
tokenizeTest('00000', [[t.IntLit, '00000', 1, 1]]);
tokenizeTest('00100', [[t.IntLit, '00100', 1, 1]]);

tokenizeTest('1.123', [[t.FloatLit, '1.123', 1, 1]]);
tokenizeTest('123.1', [[t.FloatLit, '123.1', 1, 1]]);
tokenizeTest('01234.1234', [[t.FloatLit, '01234.1234', 1, 1]]);
tokenizeTest('00000.00000', [[t.FloatLit, '00000.00000', 1, 1]]);
tokenizeTest('00100.10000', [[t.FloatLit, '00100.10000', 1, 1]]);
tokenizeTest('.1234', [[t.FloatLit, '.1234', 1, 1]]);
tokenizeTest('.00000', [[t.FloatLit, '.00000', 1, 1]]);
tokenizeTest('.10000', [[t.FloatLit, '.10000', 1, 1]]);

tokenizeTest('true', [[t.BoolLit, 'true', 1, 1]]);
tokenizeTest('false', [[t.BoolLit, 'false', 1, 1]]);

tokenizeTest('import', [[t.Keyword, 'import', 1, 1]]);
tokenizeTest('as', [[t.Keyword, 'as', 1, 1]]);
tokenizeTest('let', [[t.Keyword, 'let', 1, 1]]);
tokenizeTest('fn', [[t.Keyword, 'fn', 1, 1]]);
tokenizeTest('if', [[t.Keyword, 'if', 1, 1]]);
tokenizeTest('then', [[t.Keyword, 'then', 1, 1]]);
tokenizeTest('else', [[t.Keyword, 'else', 1, 1]]);
tokenizeTest('for', [[t.Keyword, 'for', 1, 1]]);
tokenizeTest('in', [[t.Keyword, 'in', 1, 1]]);

tokenizeTest('hello', [[t.Ident, 'hello', 1, 1]]);
tokenizeTest('hello1', [[t.Ident, 'hello1', 1, 1]]);
tokenizeTest('_hello', [[t.Ident, '_hello', 1, 1]]);
tokenizeTest('_1he2ll3o', [[t.Ident, '_1he2ll3o', 1, 1]]);
tokenizeTest('___', [[t.Ident, '___', 1, 1]]);

tokenizeTest("'a'", [[t.CharLit, "'a'", 1, 1]]);
tokenizeTest("'1'", [[t.CharLit, "'1'", 1, 1]]);
tokenizeTest("'*'", [[t.CharLit, "'*'", 1, 1]]);
tokenizeTest("'\\n'", [[t.CharLit, "'\\n'", 1, 1]]);
tokenizeTest("'\\r'", [[t.CharLit, "'\\r'", 1, 1]]);
tokenizeTest("'\\t'", [[t.CharLit, "'\\t'", 1, 1]]);
tokenizeTest("'\\\\'", [[t.CharLit, "'\\\\'", 1, 1]]);
tokenizeTest("'\\\"'", [[t.CharLit, "'\\\"'", 1, 1]]);
tokenizeTest("'\\''", [[t.CharLit, "'\\''", 1, 1]]);

// multiple token tests
tokenizeTest('123hello', [[t.IntLit, '123', 1, 1], [t.Ident, 'hello', 1, 4]]);

console.log(chalk.green.bold('Lexer tests passed'));
