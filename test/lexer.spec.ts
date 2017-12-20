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

// Single token tests

tokenizeTest('->', [[t.Punctuation, '->']]);
tokenizeTest(',', [[t.Punctuation, ',']]);
tokenizeTest('(', [[t.Punctuation, '(']]);
tokenizeTest(')', [[t.Punctuation, ')']]);
tokenizeTest('[', [[t.Punctuation, '[']]);
tokenizeTest(']', [[t.Punctuation, ']']]);
tokenizeTest('{', [[t.Punctuation, '{']]);
tokenizeTest('}', [[t.Punctuation, '}']]);
tokenizeTest(':', [[t.Punctuation, ':']]);
tokenizeTest('=', [[t.Punctuation, '=']]);
tokenizeTest(';', [[t.Punctuation, ';']]);

tokenizeTest('+', [[t.Operator, '+']]);
tokenizeTest('-', [[t.Operator, '-']]);
tokenizeTest('!', [[t.Operator, '!']]);
tokenizeTest('==', [[t.Operator, '==']]);
tokenizeTest('!=', [[t.Operator, '!=']]);
tokenizeTest('<', [[t.Operator, '<']]);
tokenizeTest('<=', [[t.Operator, '<=']]);
tokenizeTest('>', [[t.Operator, '>']]);
tokenizeTest('>=', [[t.Operator, '>=']]);
tokenizeTest('|', [[t.Operator, '|']]);
tokenizeTest('^', [[t.Operator, '^']]);
tokenizeTest('*', [[t.Operator, '*']]);
tokenizeTest('/', [[t.Operator, '/']]);
tokenizeTest('%', [[t.Operator, '%']]);
tokenizeTest('&', [[t.Operator, '&']]);
tokenizeTest('||', [[t.Operator, '||']]);
tokenizeTest('&&', [[t.Operator, '&&']]);

tokenizeTest('1', [[t.IntLit, '1']]);
tokenizeTest('123', [[t.IntLit, '123']]);
tokenizeTest('1234567890', [[t.IntLit, '1234567890']]);
tokenizeTest('1010101010', [[t.IntLit, '1010101010']]);
tokenizeTest('01234', [[t.IntLit, '01234']]);
tokenizeTest('00000', [[t.IntLit, '00000']]);
tokenizeTest('00100', [[t.IntLit, '00100']]);

tokenizeTest('1.123', [[t.FloatLit, '1.123']]);
tokenizeTest('123.1', [[t.FloatLit, '123.1']]);
tokenizeTest('01234.1234', [[t.FloatLit, '01234.1234']]);
tokenizeTest('00000.00000', [[t.FloatLit, '00000.00000']]);
tokenizeTest('00100.10000', [[t.FloatLit, '00100.10000']]);
tokenizeTest('.1234', [[t.FloatLit, '.1234']]);
tokenizeTest('.00000', [[t.FloatLit, '.00000']]);
tokenizeTest('.10000', [[t.FloatLit, '.10000']]);

tokenizeTest('true', [[t.BoolLit, 'true']]);
tokenizeTest('false', [[t.BoolLit, 'false']]);

tokenizeTest('import', [[t.Keyword, 'import']]);
tokenizeTest('as', [[t.Keyword, 'as']]);
tokenizeTest('let', [[t.Keyword, 'let']]);
tokenizeTest('fn', [[t.Keyword, 'fn']]);
tokenizeTest('if', [[t.Keyword, 'if']]);
tokenizeTest('then', [[t.Keyword, 'then']]);
tokenizeTest('else', [[t.Keyword, 'else']]);
tokenizeTest('for', [[t.Keyword, 'for']]);
tokenizeTest('in', [[t.Keyword, 'in']]);

tokenizeTest('hello', [[t.Ident, 'hello']]);
tokenizeTest('hello1', [[t.Ident, 'hello1']]);
tokenizeTest('_hello', [[t.Ident, '_hello']]);
tokenizeTest('_1he2ll3o', [[t.Ident, '_1he2ll3o']]);
tokenizeTest('___', [[t.Ident, '___']]);

// multiple token tests
tokenizeTest('123hello', [[t.IntLit, '123'], [t.Ident, 'hello']]);

console.log(chalk.green.bold('Lexer tests passed'));
