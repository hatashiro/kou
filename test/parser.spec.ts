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

function declTest(source: string, expected: Array<NodeExpectation>) {
  programTest(source, { imports: [], decls: expected });
}

function typeTest(source: string, expected: NodeExpectation) {
  programTest(
    `let x: ${source} = true`,
    {
      imports: [],
      decls: [
        [
          a.Decl,
          {
            name: [a.Ident, 'x'],
            type: expected,
            expr: [a.LitExpr, [a.BoolLit, 'true']],
          },
        ],
      ],
    },
    source,
  );
}

function exprTest(source: string, expected: NodeExpectation) {
  programTest(
    `let x = ${source}`,
    {
      imports: [],
      decls: [
        [
          a.Decl,
          {
            name: [a.Ident, 'x'],
            type: null,
            expr: expected,
          },
        ],
      ],
    },
    source,
  );
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

declTest(
  `
let simple = 10
let typed: string = "hello, world"
`,
  [
    [
      a.Decl,
      {
        name: [a.Ident, 'simple'],
        type: null,
        expr: [a.LitExpr, [a.IntLit, '10']],
      },
    ],
    [
      a.Decl,
      {
        name: [a.Ident, 'typed'],
        type: [a.StrType, null],
        expr: [a.LitExpr, [a.StrLit, '"hello, world"']],
      },
    ],
  ],
);

typeTest('int', [a.IntType, null]);
typeTest('float', [a.FloatType, null]);
typeTest('string', [a.StrType, null]);
typeTest('boolean', [a.BoolType, null]);
typeTest('char', [a.CharType, null]);
typeTest('void', [a.VoidType, null]);
typeTest('[int]', [a.ListType, [a.IntType, null]]);
typeTest('[[string]]', [a.ListType, [a.ListType, [a.StrType, null]]]);
typeTest('[[[boolean]]]', [
  a.ListType,
  [a.ListType, [a.ListType, [a.BoolType, null]]],
]);
typeTest('(int, float)', [
  a.TupleType,
  {
    size: 2,
    items: [[a.IntType, null], [a.FloatType, null]],
  },
]);
typeTest('(int, float, string)', [
  a.TupleType,
  {
    size: 3,
    items: [[a.IntType, null], [a.FloatType, null], [a.StrType, null]],
  },
]);
typeTest('[(int, string)]', [
  a.ListType,
  [
    a.TupleType,
    {
      size: 2,
      items: [[a.IntType, null], [a.StrType, null]],
    },
  ],
]);
typeTest('(int, [float], (string, boolean, char))', [
  a.TupleType,
  {
    size: 3,
    items: [
      [a.IntType, null],
      [a.ListType, [a.FloatType, null]],
      [
        a.TupleType,
        {
          size: 3,
          items: [[a.StrType, null], [a.BoolType, null], [a.CharType, null]],
        },
      ],
    ],
  },
]);
typeTest('(int)', [a.TupleType, { size: 1, items: [[a.IntType, null]] }]);
typeTest('()', [a.TupleType, { size: 0, items: [] }]);
typeTest('int -> boolean', [
  a.FuncType,
  { param: [a.IntType, null], return: [a.BoolType, null] },
]);
typeTest('(string, char) -> (string, int, (char))', [
  a.FuncType,
  {
    param: [
      a.TupleType,
      {
        size: 2,
        items: [[a.StrType, null], [a.CharType, null]],
      },
    ],
    return: [
      a.TupleType,
      {
        size: 3,
        items: [
          [a.StrType, null],
          [a.IntType, null],
          [a.TupleType, { size: 1, items: [[a.CharType, null]] }],
        ],
      },
    ],
  },
]);
typeTest('boolean -> [string] -> string', [
  a.FuncType,
  {
    param: [a.BoolType, null],
    return: [
      a.FuncType,
      {
        param: [a.ListType, [a.StrType, null]],
        return: [a.StrType, null],
      },
    ],
  },
]);
typeTest('string -> string -> string -> string', [
  a.FuncType,
  {
    param: [a.StrType, null],
    return: [
      a.FuncType,
      {
        param: [a.StrType, null],
        return: [
          a.FuncType,
          {
            param: [a.StrType, null],
            return: [a.StrType, null],
          },
        ],
      },
    ],
  },
]);
typeTest('() -> void', [
  a.FuncType,
  {
    param: [a.TupleType, { size: 0, items: [] }],
    return: [a.VoidType, null],
  },
]);

exprTest('1234', [a.LitExpr, [a.IntLit, '1234']]);
exprTest('1.234', [a.LitExpr, [a.FloatLit, '1.234']]);
exprTest('"hello, world"', [a.LitExpr, [a.StrLit, '"hello, world"']]);
exprTest('true', [a.LitExpr, [a.BoolLit, 'true']]);
exprTest('false', [a.LitExpr, [a.BoolLit, 'false']]);
exprTest("'c'", [a.LitExpr, [a.CharLit, "'c'"]]);

exprTest('some_var', [a.IdentExpr, [a.Ident, 'some_var']]);

exprTest('-1234', [
  a.UnaryExpr,
  { op: [a.UnaryOp, '-'], right: [a.LitExpr, [a.IntLit, '1234']] },
]);
exprTest('+1234', [
  a.UnaryExpr,
  { op: [a.UnaryOp, '+'], right: [a.LitExpr, [a.IntLit, '1234']] },
]);
exprTest('-+1234', [
  a.UnaryExpr,
  {
    op: [a.UnaryOp, '-'],
    right: [
      a.UnaryExpr,
      { op: [a.UnaryOp, '+'], right: [a.LitExpr, [a.IntLit, '1234']] },
    ],
  },
]);
exprTest('!true', [
  a.UnaryExpr,
  { op: [a.UnaryOp, '!'], right: [a.LitExpr, [a.BoolLit, 'true']] },
]);
exprTest('!!!!false', [
  a.UnaryExpr,
  {
    op: [a.UnaryOp, '!'],
    right: [
      a.UnaryExpr,
      {
        op: [a.UnaryOp, '!'],
        right: [
          a.UnaryExpr,
          {
            op: [a.UnaryOp, '!'],
            right: [
              a.UnaryExpr,
              {
                op: [a.UnaryOp, '!'],
                right: [a.LitExpr, [a.BoolLit, 'false']],
              },
            ],
          },
        ],
      },
    ],
  },
]);
exprTest('+some_int', [
  a.UnaryExpr,
  { op: [a.UnaryOp, '+'], right: [a.IdentExpr, [a.Ident, 'some_int']] },
]);

console.log(chalk.green.bold('Parser tests passed'));
