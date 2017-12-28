import * as chalk from 'chalk';
import { tokenize } from '../src/lexer';
import { parse } from '../src/parser';
import * as a from '../src/parser/ast';

type NodeExpectation = [Function, any, number | undefined, number | undefined];

function valueEqual(actual: any, expected: any): boolean {
  if (actual instanceof a.Node) {
    astEqual(actual, expected);
    return true;
  } else if (Array.isArray(actual) && Array.isArray(expected)) {
    return (
      actual.length === expected.length &&
      actual.every((el, idx) => valueEqual(el, expected[idx]))
    );
  } else if (actual instanceof Object && expected instanceof Object) {
    return Object.entries(actual).every(([key, val]) =>
      valueEqual(val, expected[key]),
    );
  } else {
    return actual === expected;
  }
}

function astEqual(actual: a.Node<any>, expected?: NodeExpectation) {
  let Con, value, row, column;
  if (expected) {
    [Con, value, row, column] = expected;
  }

  if (
    expected &&
    actual instanceof Con &&
    (typeof row === 'undefined' || actual.row === row) &&
    (typeof column === 'undefined' || actual.column === column) &&
    valueEqual(actual.value, value)
  ) {
    return;
  }

  let expectedPos = '';
  let actualPos = '';
  if (row && column) {
    expectedPos = `${row}, ${column}, `;
    actualPos = `${actual.row}, ${actual.column}, `;
  }
  throw new Error(
    `Expected ${
      expected
        ? `${Con['name']}(${expectedPos}${JSON.stringify(value)})`
        : 'undefined'
    }, found ${actual.constructor['name']}(${actualPos}${JSON.stringify(
      actual.value,
    )})`,
  );
}

// FIXME: test
astEqual(
  new a.Program(
    {
      imports: [
        new a.Import(
          {
            path: new a.StrLit('test.kou', 1, 1),
            name: new a.Ident('test_name', 1, 1),
            alias: new a.Ident('test_alias', 1, 1),
          },
          1,
          1,
        ),
      ],
      decls: [],
    },
    1,
    1,
  ),
  [
    a.Program,
    {
      imports: [
        [
          a.Import,
          {
            path: [a.StrLit, 'test.kou'],
            name: [a.Ident, 'test_name'],
            alias: [a.Ident, 'test_alias'],
          },
        ],
      ],
      decls: [],
    },
  ],
);

console.log(chalk.green.bold('Parser tests passed'));
