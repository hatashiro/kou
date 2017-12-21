import * as chalk from 'chalk';
import { tokenize } from '../src/lexer';
import * as t from '../src/lexer/token';

type TokenExpectation = [
  Function,
  string,
  number | undefined,
  number | undefined
];

function tokenEqual(token: t.Token<any>, expected?: TokenExpectation) {
  let Con, rep, row, column;
  if (expected) {
    [Con, rep, row, column] = expected;
  }

  if (
    expected &&
    token instanceof Con &&
    token.rep === rep &&
    (typeof row === 'undefined' || token.row === row) &&
    (typeof column === 'undefined' || token.column === column)
  ) {
    // success
    return;
  }

  throw new Error(
    `Expected ${
      expected ? `${Con['name']}(${row}, ${column}, ${rep})` : 'undefined'
    }, found ${token.constructor['name']}(${token.row}, ${token.column}, ${
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

// single token test
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

tokenizeTest('"hello, world 123!"', [[t.StrLit, '"hello, world 123!"', 1, 1]]);
tokenizeTest('"!@#$\'%^&*()"', [[t.StrLit, '"!@#$\'%^&*()"', 1, 1]]);
tokenizeTest('"hello,\\nworld!"', [[t.StrLit, '"hello,\\nworld!"', 1, 1]]);
tokenizeTest('"hello,\\rworld!"', [[t.StrLit, '"hello,\\rworld!"', 1, 1]]);
tokenizeTest('"hello,\\tworld!"', [[t.StrLit, '"hello,\\tworld!"', 1, 1]]);
tokenizeTest('"hello,\\\\world!"', [[t.StrLit, '"hello,\\\\world!"', 1, 1]]);
tokenizeTest('"hello,\\"world!"', [[t.StrLit, '"hello,\\"world!"', 1, 1]]);
tokenizeTest('"hello,\\\'rworld!"', [[t.StrLit, '"hello,\\\'rworld!"', 1, 1]]);

// token position test
tokenizeTest('123hello', [[t.IntLit, '123', 1, 1], [t.Ident, 'hello', 1, 4]]);
tokenizeTest('123     hello', [
  [t.IntLit, '123', 1, 1],
  [t.Ident, 'hello', 1, 9],
]);
tokenizeTest('123\n\nhello', [
  [t.IntLit, '123', 1, 1],
  [t.Ident, 'hello', 3, 1],
]);
tokenizeTest('123\n\n   hello', [
  [t.IntLit, '123', 1, 1],
  [t.Ident, 'hello', 3, 4],
]);

// empty program test
tokenizeTest('', []);

// actual program test
tokenizeTest(
  `
import "/some/x.kou" (x)
import "/some/xy.kou" (x, y)
import "/some/as.kou" (orig_one as new_one)
import "/some/asas.kou" (orig_one2 as new_one2, orig3 as new3)

let main: () -> void = fn () void {
  let x: (int, string, char) = (123, "hello, world", '\\n');
  let y: [float] = [1.3, .0, 0.4, .12345];
  if fst(x) == 123 {
    println(add(1, 2));
  } else {
    let z = y[1] - .1;
  }
}

let add = fn (x: int, y: int) int x + y
`,
  [
    [t.Keyword, 'import'],
    [t.StrLit, '"/some/x.kou"'],
    [t.Punctuation, '('],
    [t.Ident, 'x'],
    [t.Punctuation, ')'],
    [t.Keyword, 'import'],
    [t.StrLit, '"/some/xy.kou"'],
    [t.Punctuation, '('],
    [t.Ident, 'x'],
    [t.Punctuation, ','],
    [t.Ident, 'y'],
    [t.Punctuation, ')'],
    [t.Keyword, 'import'],
    [t.StrLit, '"/some/as.kou"'],
    [t.Punctuation, '('],
    [t.Ident, 'orig_one'],
    [t.Keyword, 'as'],
    [t.Ident, 'new_one'],
    [t.Punctuation, ')'],
    [t.Keyword, 'import'],
    [t.StrLit, '"/some/asas.kou"'],
    [t.Punctuation, '('],
    [t.Ident, 'orig_one2'],
    [t.Keyword, 'as'],
    [t.Ident, 'new_one2'],
    [t.Punctuation, ','],
    [t.Ident, 'orig3'],
    [t.Keyword, 'as'],
    [t.Ident, 'new3'],
    [t.Punctuation, ')'],
    [t.Keyword, 'let'],
    [t.Ident, 'main'],
    [t.Punctuation, ':'],
    [t.Punctuation, '('],
    [t.Punctuation, ')'],
    [t.Punctuation, '->'],
    [t.Ident, 'void'],
    [t.Punctuation, '='],
    [t.Keyword, 'fn'],
    [t.Punctuation, '('],
    [t.Punctuation, ')'],
    [t.Ident, 'void'],
    [t.Punctuation, '{'],
    [t.Keyword, 'let'],
    [t.Ident, 'x'],
    [t.Punctuation, ':'],
    [t.Punctuation, '('],
    [t.Ident, 'int'],
    [t.Punctuation, ','],
    [t.Ident, 'string'],
    [t.Punctuation, ','],
    [t.Ident, 'char'],
    [t.Punctuation, ')'],
    [t.Punctuation, '='],
    [t.Punctuation, '('],
    [t.IntLit, '123'],
    [t.Punctuation, ','],
    [t.StrLit, '"hello, world"'],
    [t.Punctuation, ','],
    [t.CharLit, "'\\n'"],
    [t.Punctuation, ')'],
    [t.Punctuation, ';'],
    [t.Keyword, 'let'],
    [t.Ident, 'y'],
    [t.Punctuation, ':'],
    [t.Punctuation, '['],
    [t.Ident, 'float'],
    [t.Punctuation, ']'],
    [t.Punctuation, '='],
    [t.Punctuation, '['],
    [t.FloatLit, '1.3'],
    [t.Punctuation, ','],
    [t.FloatLit, '.0'],
    [t.Punctuation, ','],
    [t.FloatLit, '0.4'],
    [t.Punctuation, ','],
    [t.FloatLit, '.12345'],
    [t.Punctuation, ']'],
    [t.Punctuation, ';'],
    [t.Keyword, 'if'],
    [t.Ident, 'fst'],
    [t.Punctuation, '('],
    [t.Ident, 'x'],
    [t.Punctuation, ')'],
    [t.Operator, '=='],
    [t.IntLit, '123'],
    [t.Punctuation, '{'],
    [t.Ident, 'println'],
    [t.Punctuation, '('],
    [t.Ident, 'add'],
    [t.Punctuation, '('],
    [t.IntLit, '1'],
    [t.Punctuation, ','],
    [t.IntLit, '2'],
    [t.Punctuation, ')'],
    [t.Punctuation, ')'],
    [t.Punctuation, ';'],
    [t.Punctuation, '}'],
    [t.Keyword, 'else'],
    [t.Punctuation, '{'],
    [t.Keyword, 'let'],
    [t.Ident, 'z'],
    [t.Punctuation, '='],
    [t.Ident, 'y'],
    [t.Punctuation, '['],
    [t.IntLit, '1'],
    [t.Punctuation, ']'],
    [t.Operator, '-'],
    [t.FloatLit, '.1'],
    [t.Punctuation, ';'],
    [t.Punctuation, '}'],
    [t.Punctuation, '}'],
    [t.Keyword, 'let'],
    [t.Ident, 'add'],
    [t.Punctuation, '='],
    [t.Keyword, 'fn'],
    [t.Punctuation, '('],
    [t.Ident, 'x'],
    [t.Punctuation, ':'],
    [t.Ident, 'int'],
    [t.Punctuation, ','],
    [t.Ident, 'y'],
    [t.Punctuation, ':'],
    [t.Ident, 'int'],
    [t.Punctuation, ')'],
    [t.Ident, 'int'],
    [t.Ident, 'x'],
    [t.Operator, '+'],
    [t.Ident, 'y'],
  ],
);

console.log(chalk.green.bold('Lexer tests passed'));
