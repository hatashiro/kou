import chalk from 'chalk';
import { tokenize } from '../src/lexer';
import * as t from '../src/lexer/token';

console.log(chalk.bold('Running lexer tests...'));

type TokenExpectation<Tk extends t.Token<any> = t.Token<any>> = [
  t.TokenConstructor<t.RepType<Tk>, Tk>,
  t.RepType<Tk>,
  number | undefined,
  number | undefined
];

const exp = <Tk extends t.Token<any>>(
  Cons: t.TokenConstructor<t.RepType<Tk>, Tk>,
  rep: t.RepType<Tk>,
  row?: number,
  column?: number,
): TokenExpectation<Tk> => [Cons, rep, row, column];

function tokenEqual<T, Tk extends t.Token<T>>(
  token: Tk,
  expected?: TokenExpectation<Tk>,
) {
  if (!expected) {
    throw new Error(
      `Expected undefined, found ${token.constructor['name']}(${token.row}, ${
        token.column
      }, ${token.rep})`,
    );
  }

  let [Con, rep, row, column] = expected;

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
    `Expected ${Con['name']}(${row}, ${column}, ${rep}), found ${
      token.constructor['name']
    }(${token.row}, ${token.column}, ${token.rep})`,
  );
}

function tokenizeTest(input: string, expectations: Array<TokenExpectation>) {
  expectations.push(exp(t.EOF, null));
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
tokenizeTest('->', [exp(t.Punctuation, '->', 1, 1)]);
tokenizeTest(',', [exp(t.Punctuation, ',', 1, 1)]);
tokenizeTest('(', [exp(t.Punctuation, '(', 1, 1)]);
tokenizeTest(')', [exp(t.Punctuation, ')', 1, 1)]);
tokenizeTest('[', [exp(t.Punctuation, '[', 1, 1)]);
tokenizeTest(']', [exp(t.Punctuation, ']', 1, 1)]);
tokenizeTest('{', [exp(t.Punctuation, '{', 1, 1)]);
tokenizeTest('}', [exp(t.Punctuation, '}', 1, 1)]);
tokenizeTest(':', [exp(t.Punctuation, ':', 1, 1)]);
tokenizeTest('=', [exp(t.Punctuation, '=', 1, 1)]);
tokenizeTest(';', [exp(t.Punctuation, ';', 1, 1)]);

tokenizeTest('+', [exp(t.Operator, '+', 1, 1)]);
tokenizeTest('-', [exp(t.Operator, '-', 1, 1)]);
tokenizeTest('!', [exp(t.Operator, '!', 1, 1)]);
tokenizeTest('==', [exp(t.Operator, '==', 1, 1)]);
tokenizeTest('!=', [exp(t.Operator, '!=', 1, 1)]);
tokenizeTest('<', [exp(t.Operator, '<', 1, 1)]);
tokenizeTest('<=', [exp(t.Operator, '<=', 1, 1)]);
tokenizeTest('>', [exp(t.Operator, '>', 1, 1)]);
tokenizeTest('>=', [exp(t.Operator, '>=', 1, 1)]);
tokenizeTest('|', [exp(t.Operator, '|', 1, 1)]);
tokenizeTest('^', [exp(t.Operator, '^', 1, 1)]);
tokenizeTest('*', [exp(t.Operator, '*', 1, 1)]);
tokenizeTest('/', [exp(t.Operator, '/', 1, 1)]);
tokenizeTest('%', [exp(t.Operator, '%', 1, 1)]);
tokenizeTest('&', [exp(t.Operator, '&', 1, 1)]);
tokenizeTest('||', [exp(t.Operator, '||', 1, 1)]);
tokenizeTest('&&', [exp(t.Operator, '&&', 1, 1)]);

tokenizeTest('1', [exp(t.IntLit, '1', 1, 1)]);
tokenizeTest('123', [exp(t.IntLit, '123', 1, 1)]);
tokenizeTest('1234567890', [exp(t.IntLit, '1234567890', 1, 1)]);
tokenizeTest('1010101010', [exp(t.IntLit, '1010101010', 1, 1)]);
tokenizeTest('01234', [exp(t.IntLit, '01234', 1, 1)]);
tokenizeTest('00000', [exp(t.IntLit, '00000', 1, 1)]);
tokenizeTest('00100', [exp(t.IntLit, '00100', 1, 1)]);

tokenizeTest('1.123', [exp(t.FloatLit, '1.123', 1, 1)]);
tokenizeTest('123.1', [exp(t.FloatLit, '123.1', 1, 1)]);
tokenizeTest('01234.1234', [exp(t.FloatLit, '01234.1234', 1, 1)]);
tokenizeTest('00000.00000', [exp(t.FloatLit, '00000.00000', 1, 1)]);
tokenizeTest('00100.10000', [exp(t.FloatLit, '00100.10000', 1, 1)]);
tokenizeTest('.1234', [exp(t.FloatLit, '.1234', 1, 1)]);
tokenizeTest('.00000', [exp(t.FloatLit, '.00000', 1, 1)]);
tokenizeTest('.10000', [exp(t.FloatLit, '.10000', 1, 1)]);

tokenizeTest('true', [exp(t.BoolLit, 'true', 1, 1)]);
tokenizeTest('false', [exp(t.BoolLit, 'false', 1, 1)]);

tokenizeTest('import', [exp(t.Keyword, 'import', 1, 1)]);
tokenizeTest('as', [exp(t.Keyword, 'as', 1, 1)]);
tokenizeTest('let', [exp(t.Keyword, 'let', 1, 1)]);
tokenizeTest('fn', [exp(t.Keyword, 'fn', 1, 1)]);
tokenizeTest('if', [exp(t.Keyword, 'if', 1, 1)]);
tokenizeTest('else', [exp(t.Keyword, 'else', 1, 1)]);
tokenizeTest('for', [exp(t.Keyword, 'for', 1, 1)]);
tokenizeTest('in', [exp(t.Keyword, 'in', 1, 1)]);
tokenizeTest('new', [exp(t.Keyword, 'new', 1, 1)]);

tokenizeTest('hello', [exp(t.Ident, 'hello', 1, 1)]);
tokenizeTest('hello1', [exp(t.Ident, 'hello1', 1, 1)]);
tokenizeTest('_hello', [exp(t.Ident, '_hello', 1, 1)]);
tokenizeTest('_1he2ll3o', [exp(t.Ident, '_1he2ll3o', 1, 1)]);
tokenizeTest('___', [exp(t.Ident, '___', 1, 1)]);

tokenizeTest("'a'", [exp(t.CharLit, "'a'", 1, 1)]);
tokenizeTest("'1'", [exp(t.CharLit, "'1'", 1, 1)]);
tokenizeTest("'*'", [exp(t.CharLit, "'*'", 1, 1)]);
tokenizeTest("'\\n'", [exp(t.CharLit, "'\\n'", 1, 1)]);
tokenizeTest("'\\r'", [exp(t.CharLit, "'\\r'", 1, 1)]);
tokenizeTest("'\\t'", [exp(t.CharLit, "'\\t'", 1, 1)]);
tokenizeTest("'\\\\'", [exp(t.CharLit, "'\\\\'", 1, 1)]);
tokenizeTest("'\\\"'", [exp(t.CharLit, "'\\\"'", 1, 1)]);
tokenizeTest("'\\''", [exp(t.CharLit, "'\\''", 1, 1)]);

tokenizeTest('"hello, world 123!"', [
  exp(t.StrLit, '"hello, world 123!"', 1, 1),
]);
tokenizeTest('"!@#$\'%^&*()"', [exp(t.StrLit, '"!@#$\'%^&*()"', 1, 1)]);
tokenizeTest('"hello,\\nworld!"', [exp(t.StrLit, '"hello,\\nworld!"', 1, 1)]);
tokenizeTest('"hello,\\rworld!"', [exp(t.StrLit, '"hello,\\rworld!"', 1, 1)]);
tokenizeTest('"hello,\\tworld!"', [exp(t.StrLit, '"hello,\\tworld!"', 1, 1)]);
tokenizeTest('"hello,\\\\world!"', [exp(t.StrLit, '"hello,\\\\world!"', 1, 1)]);
tokenizeTest('"hello,\\"world!"', [exp(t.StrLit, '"hello,\\"world!"', 1, 1)]);
tokenizeTest('"hello,\\\'rworld!"', [
  exp(t.StrLit, '"hello,\\\'rworld!"', 1, 1),
]);

// token position test
tokenizeTest('123hello', [
  exp(t.IntLit, '123', 1, 1),
  exp(t.Ident, 'hello', 1, 4),
]);
tokenizeTest('123     hello', [
  exp(t.IntLit, '123', 1, 1),
  exp(t.Ident, 'hello', 1, 9),
]);
tokenizeTest('123\n\nhello', [
  exp(t.IntLit, '123', 1, 1),
  exp(t.Ident, 'hello', 3, 1),
]);
tokenizeTest('123\n\n   hello', [
  exp(t.IntLit, '123', 1, 1),
  exp(t.Ident, 'hello', 3, 4),
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

let add = fn (x: int, y: int) int { x + y }
`,
  [
    exp(t.Keyword, 'import'),
    exp(t.StrLit, '"/some/x.kou"'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'x'),
    exp(t.Punctuation, ')'),
    exp(t.Keyword, 'import'),
    exp(t.StrLit, '"/some/xy.kou"'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'x'),
    exp(t.Punctuation, ','),
    exp(t.Ident, 'y'),
    exp(t.Punctuation, ')'),
    exp(t.Keyword, 'import'),
    exp(t.StrLit, '"/some/as.kou"'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'orig_one'),
    exp(t.Keyword, 'as'),
    exp(t.Ident, 'new_one'),
    exp(t.Punctuation, ')'),
    exp(t.Keyword, 'import'),
    exp(t.StrLit, '"/some/asas.kou"'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'orig_one2'),
    exp(t.Keyword, 'as'),
    exp(t.Ident, 'new_one2'),
    exp(t.Punctuation, ','),
    exp(t.Ident, 'orig3'),
    exp(t.Keyword, 'as'),
    exp(t.Ident, 'new3'),
    exp(t.Punctuation, ')'),
    exp(t.Keyword, 'let'),
    exp(t.Ident, 'main'),
    exp(t.Punctuation, ':'),
    exp(t.Punctuation, '('),
    exp(t.Punctuation, ')'),
    exp(t.Punctuation, '->'),
    exp(t.Ident, 'void'),
    exp(t.Punctuation, '='),
    exp(t.Keyword, 'fn'),
    exp(t.Punctuation, '('),
    exp(t.Punctuation, ')'),
    exp(t.Ident, 'void'),
    exp(t.Punctuation, '{'),
    exp(t.Keyword, 'let'),
    exp(t.Ident, 'x'),
    exp(t.Punctuation, ':'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'int'),
    exp(t.Punctuation, ','),
    exp(t.Ident, 'string'),
    exp(t.Punctuation, ','),
    exp(t.Ident, 'char'),
    exp(t.Punctuation, ')'),
    exp(t.Punctuation, '='),
    exp(t.Punctuation, '('),
    exp(t.IntLit, '123'),
    exp(t.Punctuation, ','),
    exp(t.StrLit, '"hello, world"'),
    exp(t.Punctuation, ','),
    exp(t.CharLit, "'\\n'"),
    exp(t.Punctuation, ')'),
    exp(t.Punctuation, ';'),
    exp(t.Keyword, 'let'),
    exp(t.Ident, 'y'),
    exp(t.Punctuation, ':'),
    exp(t.Punctuation, '['),
    exp(t.Ident, 'float'),
    exp(t.Punctuation, ']'),
    exp(t.Punctuation, '='),
    exp(t.Punctuation, '['),
    exp(t.FloatLit, '1.3'),
    exp(t.Punctuation, ','),
    exp(t.FloatLit, '.0'),
    exp(t.Punctuation, ','),
    exp(t.FloatLit, '0.4'),
    exp(t.Punctuation, ','),
    exp(t.FloatLit, '.12345'),
    exp(t.Punctuation, ']'),
    exp(t.Punctuation, ';'),
    exp(t.Keyword, 'if'),
    exp(t.Ident, 'fst'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'x'),
    exp(t.Punctuation, ')'),
    exp(t.Operator, '=='),
    exp(t.IntLit, '123'),
    exp(t.Punctuation, '{'),
    exp(t.Ident, 'println'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'add'),
    exp(t.Punctuation, '('),
    exp(t.IntLit, '1'),
    exp(t.Punctuation, ','),
    exp(t.IntLit, '2'),
    exp(t.Punctuation, ')'),
    exp(t.Punctuation, ')'),
    exp(t.Punctuation, ';'),
    exp(t.Punctuation, '}'),
    exp(t.Keyword, 'else'),
    exp(t.Punctuation, '{'),
    exp(t.Keyword, 'let'),
    exp(t.Ident, 'z'),
    exp(t.Punctuation, '='),
    exp(t.Ident, 'y'),
    exp(t.Punctuation, '['),
    exp(t.IntLit, '1'),
    exp(t.Punctuation, ']'),
    exp(t.Operator, '-'),
    exp(t.FloatLit, '.1'),
    exp(t.Punctuation, ';'),
    exp(t.Punctuation, '}'),
    exp(t.Punctuation, '}'),
    exp(t.Keyword, 'let'),
    exp(t.Ident, 'add'),
    exp(t.Punctuation, '='),
    exp(t.Keyword, 'fn'),
    exp(t.Punctuation, '('),
    exp(t.Ident, 'x'),
    exp(t.Punctuation, ':'),
    exp(t.Ident, 'int'),
    exp(t.Punctuation, ','),
    exp(t.Ident, 'y'),
    exp(t.Punctuation, ':'),
    exp(t.Ident, 'int'),
    exp(t.Punctuation, ')'),
    exp(t.Ident, 'int'),
    exp(t.Punctuation, '{'),
    exp(t.Ident, 'x'),
    exp(t.Operator, '+'),
    exp(t.Ident, 'y'),
    exp(t.Punctuation, '}'),
  ],
);

console.log(chalk.green.bold('Passed!'));
