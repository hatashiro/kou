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
    return Object.entries(expected).every(([key, val]) =>
      valueEqual(actual[key], val),
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

function programTest(
  input: string,
  expected: any,
  sourceToShow: string = input,
) {
  try {
    astEqual(parse(tokenize(input)), [a.Program, expected]);
  } catch (err) {
    console.error(chalk.blue.bold('Source:'));
    console.error(sourceToShow);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

function importTest(source: string, expected: Array<NodeExpectation>) {
  programTest(source, { imports: expected, decls: [] });
}

importTest('import "test.kou" (test_name)', [
  [
    a.Import,
    {
      path: [a.StrLit, '"test.kou"'],
      elems: [
        {
          name: [a.Ident, 'test_name'],
          as: null,
        },
      ],
    },
  ],
]);

importTest('import "test.kou" (test_name as test_alias)', [
  [
    a.Import,
    {
      path: [a.StrLit, '"test.kou"'],
      elems: [
        {
          name: [a.Ident, 'test_name'],
          as: [a.Ident, 'test_alias'],
        },
      ],
    },
  ],
]);

importTest('import "test.kou" (test_name as test_alias, hoge, foo as bar)', [
  [
    a.Import,
    {
      path: [a.StrLit, '"test.kou"'],
      elems: [
        {
          name: [a.Ident, 'test_name'],
          as: [a.Ident, 'test_alias'],
        },
        {
          name: [a.Ident, 'hoge'],
          as: null,
        },
        {
          name: [a.Ident, 'foo'],
          as: [a.Ident, 'bar'],
        },
      ],
    },
  ],
]);

importTest(
  `
import "file1.kou" (test_name as test_alias)
import "file2.kou" (test_name as test_alias, hoge, foo as bar)
`,
  [
    [
      a.Import,
      {
        path: [a.StrLit, '"file1.kou"'],
        elems: [
          {
            name: [a.Ident, 'test_name'],
            as: [a.Ident, 'test_alias'],
          },
        ],
      },
    ],
    [
      a.Import,
      {
        path: [a.StrLit, '"file2.kou"'],
        elems: [
          {
            name: [a.Ident, 'test_name'],
            as: [a.Ident, 'test_alias'],
          },
          {
            name: [a.Ident, 'hoge'],
            as: null,
          },
          {
            name: [a.Ident, 'foo'],
            as: [a.Ident, 'bar'],
          },
        ],
      },
    ],
  ],
);

console.log(chalk.green.bold('Parser tests passed'));
