import chalk from 'chalk';
import { tokenize } from '../src/lexer';
import { parse } from '../src/parser';
import * as a from '../src/parser/ast';
import { Compose } from '../src/util';

console.log(chalk.bold('Running parser tests...'));

type NodeExpectation<N extends a.Node<any> = a.Node<any>> = [
  a.NodeConstructor<a.ValType<N>, N>,
  any,
  number | undefined,
  number | undefined
];

const exp = <N extends a.Node<any>>(
  Cons: a.NodeConstructor<a.ValType<N>, N>,
  value: any = null,
  row?: number,
  column?: number,
): NodeExpectation<N> => [Cons, value, row, column];

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
  if (!expected) {
    throw new Error(
      `Expected undefined, found ${actual.constructor['name']}(${actual.row}, ${
        actual.column
      }, ${JSON.stringify(actual.value)})`,
    );
  }

  let [Con, value, row, column] = expected;

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
    `Expected ${Con['name']}(${expectedPos}${JSON.stringify(value)}), found ${
      actual.constructor['name']
    }(${actualPos}${JSON.stringify(actual.value)})`,
  );
}

const compile = Compose.then(tokenize).then(parse).f;

function programTest(
  input: string,
  expected: any,
  sourceToShow: string = input,
) {
  try {
    astEqual(compile(input), exp(a.Module, expected));
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
        exp(a.Decl, {
          name: exp(a.Ident, 'x'),
          type: expected,
          expr: exp(a.LitExpr, exp(a.BoolLit, 'true')),
        }),
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
        exp(a.Decl, {
          name: exp(a.Ident, 'x'),
          type: null,
          expr: expected,
        }),
      ],
    },
    source,
  );
}

importTest('import "test.kou" (test_name)', [
  exp(a.Import, {
    path: exp(a.StrLit, '"test.kou"'),
    elems: [
      {
        name: exp(a.Ident, 'test_name'),
        as: null,
      },
    ],
  }),
]);

importTest('import "test.kou" (test_name as test_alias)', [
  exp(a.Import, {
    path: exp(a.StrLit, '"test.kou"'),
    elems: [
      {
        name: exp(a.Ident, 'test_name'),
        as: exp(a.Ident, 'test_alias'),
      },
    ],
  }),
]);

importTest('import "test.kou" (test_name as test_alias, hoge, foo as bar)', [
  exp(a.Import, {
    path: exp(a.StrLit, '"test.kou"'),
    elems: [
      {
        name: exp(a.Ident, 'test_name'),
        as: exp(a.Ident, 'test_alias'),
      },
      {
        name: exp(a.Ident, 'hoge'),
        as: null,
      },
      {
        name: exp(a.Ident, 'foo'),
        as: exp(a.Ident, 'bar'),
      },
    ],
  }),
]);

importTest(
  `
import "file1.kou" (test_name as test_alias)
import "file2.kou" (test_name as test_alias, hoge, foo as bar)
`,
  [
    exp(a.Import, {
      path: exp(a.StrLit, '"file1.kou"'),
      elems: [
        {
          name: exp(a.Ident, 'test_name'),
          as: exp(a.Ident, 'test_alias'),
        },
      ],
    }),
    exp(a.Import, {
      path: exp(a.StrLit, '"file2.kou"'),
      elems: [
        {
          name: exp(a.Ident, 'test_name'),
          as: exp(a.Ident, 'test_alias'),
        },
        {
          name: exp(a.Ident, 'hoge'),
          as: null,
        },
        {
          name: exp(a.Ident, 'foo'),
          as: exp(a.Ident, 'bar'),
        },
      ],
    }),
  ],
);

declTest(
  `
let simple = 10
let typed: str = "hello, world"
`,
  [
    exp(a.Decl, {
      name: exp(a.Ident, 'simple'),
      type: null,
      expr: exp(a.LitExpr, exp(a.IntLit, '10')),
    }),
    exp(a.Decl, {
      name: exp(a.Ident, 'typed'),
      type: exp(a.StrType),
      expr: exp(a.LitExpr, exp(a.StrLit, '"hello, world"')),
    }),
  ],
);

typeTest('int', exp(a.IntType));
typeTest('float', exp(a.FloatType));
typeTest('str', exp(a.StrType));
typeTest('bool', exp(a.BoolType));
typeTest('char', exp(a.CharType));
typeTest('void', exp(a.VoidType));
typeTest('[int]', exp(a.ArrayType, exp(a.IntType)));
typeTest('[[str]]', exp(a.ArrayType, exp(a.ArrayType, exp(a.StrType))));
typeTest(
  '[[[bool]]]',
  exp(a.ArrayType, exp(a.ArrayType, exp(a.ArrayType, exp(a.BoolType)))),
);
typeTest(
  '(int, float)',
  exp(a.TupleType, {
    size: 2,
    items: [exp(a.IntType), exp(a.FloatType)],
  }),
);
typeTest(
  '(int, float, str)',
  exp(a.TupleType, {
    size: 3,
    items: [exp(a.IntType), exp(a.FloatType), exp(a.StrType)],
  }),
);
typeTest(
  '[(int, str)]',
  exp(
    a.ArrayType,
    exp(a.TupleType, {
      size: 2,
      items: [exp(a.IntType), exp(a.StrType)],
    }),
  ),
);
typeTest(
  '(int, [float], (str, bool, char))',
  exp(a.TupleType, {
    size: 3,
    items: [
      exp(a.IntType),
      exp(a.ArrayType, exp(a.FloatType)),
      exp(a.TupleType, {
        size: 3,
        items: [exp(a.StrType), exp(a.BoolType), exp(a.CharType)],
      }),
    ],
  }),
);
typeTest('(int)', exp(a.TupleType, { size: 1, items: [exp(a.IntType)] }));
typeTest('()', exp(a.TupleType, { size: 0, items: [] }));
typeTest(
  'int -> bool',
  exp(a.FuncType, { param: exp(a.IntType), return: exp(a.BoolType) }),
);
typeTest(
  '(str, char) -> (str, int, (char))',
  exp(a.FuncType, {
    param: exp(a.TupleType, {
      size: 2,
      items: [exp(a.StrType), exp(a.CharType)],
    }),
    return: exp(a.TupleType, {
      size: 3,
      items: [
        exp(a.StrType),
        exp(a.IntType),
        exp(a.TupleType, { size: 1, items: [exp(a.CharType)] }),
      ],
    }),
  }),
);
typeTest(
  'bool -> [str] -> str',
  exp(a.FuncType, {
    param: exp(a.BoolType),
    return: exp(a.FuncType, {
      param: exp(a.ArrayType, exp(a.StrType)),
      return: exp(a.StrType),
    }),
  }),
);
typeTest(
  'str -> str -> str -> str',
  exp(a.FuncType, {
    param: exp(a.StrType),
    return: exp(a.FuncType, {
      param: exp(a.StrType),
      return: exp(a.FuncType, {
        param: exp(a.StrType),
        return: exp(a.StrType),
      }),
    }),
  }),
);
typeTest(
  '() -> void',
  exp(a.FuncType, {
    param: exp(a.TupleType, { size: 0, items: [] }),
    return: exp(a.VoidType),
  }),
);

exprTest('1234', exp(a.LitExpr, exp(a.IntLit, '1234')));
exprTest('1.234', exp(a.LitExpr, exp(a.FloatLit, '1.234')));
exprTest('"hello, world"', exp(a.LitExpr, exp(a.StrLit, '"hello, world"')));
exprTest('true', exp(a.LitExpr, exp(a.BoolLit, 'true')));
exprTest('false', exp(a.LitExpr, exp(a.BoolLit, 'false')));
exprTest("'c'", exp(a.LitExpr, exp(a.CharLit, "'c'")));

exprTest('some_var', exp(a.IdentExpr, exp(a.Ident, 'some_var')));

exprTest(
  '-1234',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '-'),
    right: exp(a.LitExpr, exp(a.IntLit, '1234')),
  }),
);
exprTest(
  '+1234',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '+'),
    right: exp(a.LitExpr, exp(a.IntLit, '1234')),
  }),
);
exprTest(
  '-+1234',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '-'),
    right: exp(a.UnaryExpr, {
      op: exp(a.UnaryOp, '+'),
      right: exp(a.LitExpr, exp(a.IntLit, '1234')),
    }),
  }),
);
exprTest(
  '!true',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '!'),
    right: exp(a.LitExpr, exp(a.BoolLit, 'true')),
  }),
);
exprTest(
  '!!!!false',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '!'),
    right: exp(a.UnaryExpr, {
      op: exp(a.UnaryOp, '!'),
      right: exp(a.UnaryExpr, {
        op: exp(a.UnaryOp, '!'),
        right: exp(a.UnaryExpr, {
          op: exp(a.UnaryOp, '!'),
          right: exp(a.LitExpr, exp(a.BoolLit, 'false')),
        }),
      }),
    }),
  }),
);
exprTest(
  '+some_int',
  exp(a.UnaryExpr, {
    op: exp(a.UnaryOp, '+'),
    right: exp(a.IdentExpr, exp(a.Ident, 'some_int')),
  }),
);

exprTest(
  '1 + 2',
  exp(a.BinaryExpr, {
    op: exp(a.AddOp, '+'),
    left: exp(a.LitExpr, exp(a.IntLit, '1')),
    right: exp(a.LitExpr, exp(a.IntLit, '2')),
  }),
);
exprTest(
  '1 + 2 * 3',
  exp(a.BinaryExpr, {
    op: exp(a.AddOp, '+'),
    left: exp(a.LitExpr, exp(a.IntLit, '1')),
    right: exp(a.BinaryExpr, {
      op: exp(a.MulOp, '*'),
      left: exp(a.LitExpr, exp(a.IntLit, '2')),
      right: exp(a.LitExpr, exp(a.IntLit, '3')),
    }),
  }),
);
exprTest(
  '1 * 2 + 3',
  exp(a.BinaryExpr, {
    op: exp(a.AddOp, '+'),
    left: exp(a.BinaryExpr, {
      op: exp(a.MulOp, '*'),
      left: exp(a.LitExpr, exp(a.IntLit, '1')),
      right: exp(a.LitExpr, exp(a.IntLit, '2')),
    }),
    right: exp(a.LitExpr, exp(a.IntLit, '3')),
  }),
);
exprTest(
  '(1 + 2) * 3',
  exp(a.BinaryExpr, {
    op: exp(a.MulOp, '*'),
    left: exp(a.TupleExpr, {
      size: 1,
      items: [
        exp(a.BinaryExpr, {
          op: exp(a.AddOp, '+'),
          left: exp(a.LitExpr, exp(a.IntLit, '1')),
          right: exp(a.LitExpr, exp(a.IntLit, '2')),
        }),
      ],
    }),
    right: exp(a.LitExpr, exp(a.IntLit, '3')),
  }),
);
exprTest(
  '1 * (2 + 3)',
  exp(a.BinaryExpr, {
    op: exp(a.MulOp, '*'),
    left: exp(a.LitExpr, exp(a.IntLit, '1')),
    right: exp(a.TupleExpr, {
      size: 1,
      items: [
        exp(a.BinaryExpr, {
          op: exp(a.AddOp, '+'),
          left: exp(a.LitExpr, exp(a.IntLit, '2')),
          right: exp(a.LitExpr, exp(a.IntLit, '3')),
        }),
      ],
    }),
  }),
);
exprTest(
  '(1 + 2 * 3 + 4 > 5) || (true && false == false || true)',
  exp(a.BinaryExpr, {
    op: exp(a.BoolOp, '||'),
    left: exp(a.TupleExpr, {
      size: 1,
      items: [
        exp(a.BinaryExpr, {
          op: exp(a.CompOp, '>'),
          left: exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.BinaryExpr, {
              op: exp(a.AddOp, '+'),
              left: exp(a.LitExpr, exp(a.IntLit, '1')),
              right: exp(a.BinaryExpr, {
                op: exp(a.MulOp, '*'),
                left: exp(a.LitExpr, exp(a.IntLit, '2')),
                right: exp(a.LitExpr, exp(a.IntLit, '3')),
              }),
            }),
            right: exp(a.LitExpr, exp(a.IntLit, '4')),
          }),
          right: exp(a.LitExpr, exp(a.IntLit, '5')),
        }),
      ],
    }),
    right: exp(a.TupleExpr, {
      size: 1,
      items: [
        exp(a.BinaryExpr, {
          op: exp(a.EqOp, '=='),
          left: exp(a.BinaryExpr, {
            op: exp(a.BoolOp, '&&'),
            left: exp(a.LitExpr, exp(a.BoolLit, 'true')),
            right: exp(a.LitExpr, exp(a.BoolLit, 'false')),
          }),
          right: exp(a.BinaryExpr, {
            op: exp(a.BoolOp, '||'),
            left: exp(a.LitExpr, exp(a.BoolLit, 'false')),
            right: exp(a.LitExpr, exp(a.BoolLit, 'true')),
          }),
        }),
      ],
    }),
  }),
);

exprTest('()', exp(a.TupleExpr, { size: 0, items: [] }));
exprTest(
  '(1)',
  exp(a.TupleExpr, { size: 1, items: [exp(a.LitExpr, exp(a.IntLit, '1'))] }),
);
exprTest(
  '(-1234, !!x, ("hello", true))',
  exp(a.TupleExpr, {
    size: 3,
    items: [
      exp(a.UnaryExpr, {
        op: exp(a.UnaryOp, '-'),
        right: exp(a.LitExpr, exp(a.IntLit, '1234')),
      }),
      exp(a.UnaryExpr, {
        op: exp(a.UnaryOp, '!'),
        right: exp(a.UnaryExpr, {
          op: exp(a.UnaryOp, '!'),
          right: exp(a.IdentExpr, exp(a.Ident, 'x')),
        }),
      }),
      exp(a.TupleExpr, {
        size: 2,
        items: [
          exp(a.LitExpr, exp(a.StrLit, '"hello"')),
          exp(a.LitExpr, exp(a.BoolLit, 'true')),
        ],
      }),
    ],
  }),
);

exprTest('[]', exp(a.ArrayExpr, []));
exprTest(
  '[1, 2, 3]',
  exp(a.ArrayExpr, [
    exp(a.LitExpr, exp(a.IntLit, '1')),
    exp(a.LitExpr, exp(a.IntLit, '2')),
    exp(a.LitExpr, exp(a.IntLit, '3')),
  ]),
);
exprTest(
  '[a, b, c]',
  exp(a.ArrayExpr, [
    exp(a.IdentExpr, exp(a.Ident, 'a')),
    exp(a.IdentExpr, exp(a.Ident, 'b')),
    exp(a.IdentExpr, exp(a.Ident, 'c')),
  ]),
);

exprTest(
  'fn () void {}',
  exp(a.FuncExpr, {
    params: {
      size: 0,
      items: [],
    },
    returnType: exp(a.VoidType),
    body: exp(a.Block, {
      bodies: [],
      returnVoid: true,
    }),
  }),
);
exprTest(
  `
fn (x int, y int) int {
  let result = x + y;
  print(result);
  result
}
`,
  exp(a.FuncExpr, {
    params: {
      size: 2,
      items: [
        { name: exp(a.Ident, 'x'), type: exp(a.IntType) },
        { name: exp(a.Ident, 'y'), type: exp(a.IntType) },
      ],
    },
    returnType: exp(a.IntType),
    body: exp(a.Block, {
      bodies: [
        exp(a.Decl, {
          name: exp(a.Ident, 'result'),
          type: null,
          expr: exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.IdentExpr, exp(a.Ident, 'x')),
            right: exp(a.IdentExpr, exp(a.Ident, 'y')),
          }),
        }),
        exp(a.CallExpr, {
          func: exp(a.IdentExpr, exp(a.Ident, 'print')),
          args: exp(a.TupleExpr, {
            size: 1,
            items: [exp(a.IdentExpr, exp(a.Ident, 'result'))],
          }),
        }),
        exp(a.IdentExpr, exp(a.Ident, 'result')),
      ],
      returnVoid: false,
    }),
  }),
);
exprTest(
  `
fn (x int, y int) int {
  let result = x + y;
  print(result);
  result;
}
`,
  exp(a.FuncExpr, {
    params: {
      size: 2,
      items: [
        { name: exp(a.Ident, 'x'), type: exp(a.IntType) },
        { name: exp(a.Ident, 'y'), type: exp(a.IntType) },
      ],
    },
    returnType: exp(a.IntType),
    body: exp(a.Block, {
      bodies: [
        exp(a.Decl, {
          name: exp(a.Ident, 'result'),
          type: null,
          expr: exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.IdentExpr, exp(a.Ident, 'x')),
            right: exp(a.IdentExpr, exp(a.Ident, 'y')),
          }),
        }),
        exp(a.CallExpr, {
          func: exp(a.IdentExpr, exp(a.Ident, 'print')),
          args: exp(a.TupleExpr, {
            size: 1,
            items: [exp(a.IdentExpr, exp(a.Ident, 'result'))],
          }),
        }),
        exp(a.IdentExpr, exp(a.Ident, 'result')),
      ],
      returnVoid: true,
    }),
  }),
);
exprTest(
  'fn (ignored [bool], negated int) int { -negated }',
  exp(a.FuncExpr, {
    params: {
      size: 2,
      items: [
        {
          name: exp(a.Ident, 'ignored'),
          type: exp(a.ArrayType, exp(a.BoolType)),
        },
        { name: exp(a.Ident, 'negated'), type: exp(a.IntType) },
      ],
    },
    returnType: exp(a.IntType),
    body: exp(a.Block, {
      bodies: [
        exp(a.UnaryExpr, {
          op: exp(a.UnaryOp, '-'),
          right: exp(a.IdentExpr, exp(a.Ident, 'negated')),
        }),
      ],
      returnVoid: false,
    }),
  }),
);
exprTest(
  `
fn (i int) () -> int {
  fn () int { i }
}`,
  exp(a.FuncExpr, {
    params: {
      size: 1,
      items: [{ name: exp(a.Ident, 'i'), type: exp(a.IntType) }],
    },
    returnType: exp(a.FuncType, {
      param: exp(a.TupleType, {
        size: 0,
        items: [],
      }),
      return: exp(a.IntType),
    }),
    body: exp(a.Block, {
      bodies: [
        exp(a.FuncExpr, {
          params: {
            size: 0,
            items: [],
          },
          returnType: exp(a.IntType),
          body: exp(a.Block, {
            bodies: [exp(a.IdentExpr, exp(a.Ident, 'i'))],
            returnVoid: false,
          }),
        }),
      ],
      returnVoid: false,
    }),
  }),
);

exprTest(
  'func()',
  exp(a.CallExpr, {
    func: exp(a.IdentExpr, exp(a.Ident, 'func')),
    args: exp(a.TupleExpr, {
      size: 0,
      items: [],
    }),
  }),
);
exprTest(
  'func2("hello", 1 + 2, true)',
  exp(a.CallExpr, {
    func: exp(a.IdentExpr, exp(a.Ident, 'func2')),
    args: exp(a.TupleExpr, {
      size: 3,
      items: [
        exp(a.LitExpr, exp(a.StrLit, '"hello"')),
        exp(a.BinaryExpr, {
          op: exp(a.AddOp, '+'),
          left: exp(a.LitExpr, exp(a.IntLit, '1')),
          right: exp(a.LitExpr, exp(a.IntLit, '2')),
        }),
        exp(a.LitExpr, exp(a.BoolLit, 'true')),
      ],
    }),
  }),
);
exprTest(
  'func3("hello")(1 + 2, true)',
  exp(a.CallExpr, {
    func: exp(a.CallExpr, {
      func: exp(a.IdentExpr, exp(a.Ident, 'func3')),
      args: exp(a.TupleExpr, {
        size: 1,
        items: [exp(a.LitExpr, exp(a.StrLit, '"hello"'))],
      }),
    }),
    args: exp(a.TupleExpr, {
      size: 2,
      items: [
        exp(a.BinaryExpr, {
          op: exp(a.AddOp, '+'),
          left: exp(a.LitExpr, exp(a.IntLit, '1')),
          right: exp(a.LitExpr, exp(a.IntLit, '2')),
        }),
        exp(a.LitExpr, exp(a.BoolLit, 'true')),
      ],
    }),
  }),
);
exprTest(
  '(fn (x int, y int) int { x + y })(10, 20)',
  exp(a.CallExpr, {
    func: exp(a.TupleExpr, {
      size: 1,
      items: [
        exp(a.FuncExpr, {
          params: {
            size: 2,
            items: [
              {
                name: exp(a.Ident, 'x'),
                type: exp(a.IntType),
              },
              {
                name: exp(a.Ident, 'y'),
                type: exp(a.IntType),
              },
            ],
          },
          returnType: exp(a.IntType),
          body: exp(a.Block, {
            bodies: [
              exp(a.BinaryExpr, {
                op: exp(a.AddOp, '+'),
                left: exp(a.IdentExpr, exp(a.Ident, 'x')),
                right: exp(a.IdentExpr, exp(a.Ident, 'y')),
              }),
            ],
            returnVoid: false,
          }),
        }),
      ],
    }),
    args: exp(a.TupleExpr, {
      size: 2,
      items: [
        exp(a.LitExpr, exp(a.IntLit, '10')),
        exp(a.LitExpr, exp(a.IntLit, '20')),
      ],
    }),
  }),
);
exprTest(
  'fn (x int, y int) int { x + y }(10, 20)',
  exp(a.CallExpr, {
    func: exp(a.FuncExpr, {
      params: {
        size: 2,
        items: [
          {
            name: exp(a.Ident, 'x'),
            type: exp(a.IntType),
          },
          {
            name: exp(a.Ident, 'y'),
            type: exp(a.IntType),
          },
        ],
      },
      returnType: exp(a.IntType),
      body: exp(a.Block, {
        bodies: [
          exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.IdentExpr, exp(a.Ident, 'x')),
            right: exp(a.IdentExpr, exp(a.Ident, 'y')),
          }),
        ],
        returnVoid: false,
      }),
    }),
    args: exp(a.TupleExpr, {
      size: 2,
      items: [
        exp(a.LitExpr, exp(a.IntLit, '10')),
        exp(a.LitExpr, exp(a.IntLit, '20')),
      ],
    }),
  }),
);

exprTest(
  'arr[idx]',
  exp(a.IndexExpr, {
    target: exp(a.IdentExpr, exp(a.Ident, 'arr')),
    index: exp(a.IdentExpr, exp(a.Ident, 'idx')),
  }),
);
exprTest(
  '[1, 2, 3][2]',
  exp(a.IndexExpr, {
    target: exp(a.ArrayExpr, [
      exp(a.LitExpr, exp(a.IntLit, '1')),
      exp(a.LitExpr, exp(a.IntLit, '2')),
      exp(a.LitExpr, exp(a.IntLit, '3')),
    ]),
    index: exp(a.LitExpr, exp(a.IntLit, '2')),
  }),
);
exprTest(
  'func()[idx % 3]("hello")[2][1]',
  exp(a.IndexExpr, {
    target: exp(a.IndexExpr, {
      target: exp(a.CallExpr, {
        func: exp(a.IndexExpr, {
          target: exp(a.CallExpr, {
            func: exp(a.IdentExpr, exp(a.Ident, 'func')),
            args: exp(a.TupleExpr, {
              size: 0,
              items: [],
            }),
          }),
          index: exp(a.BinaryExpr, {
            op: exp(a.MulOp, '%'),
            left: exp(a.IdentExpr, exp(a.Ident, 'idx')),
            right: exp(a.LitExpr, exp(a.IntLit, '3')),
          }),
        }),
        args: exp(a.TupleExpr, {
          size: 1,
          items: [exp(a.LitExpr, exp(a.StrLit, '"hello"'))],
        }),
      }),
      index: exp(a.LitExpr, exp(a.IntLit, '2')),
    }),
    index: exp(a.LitExpr, exp(a.IntLit, '1')),
  }),
);

exprTest(
  `
if 1 + 2 > 3 {
  "hello"
} else {
  "world"
}
`,
  exp(a.CondExpr, {
    if: exp(a.BinaryExpr, {
      op: exp(a.CompOp, '>'),
      left: exp(a.BinaryExpr, {
        op: exp(a.AddOp, '+'),
        left: exp(a.LitExpr, exp(a.IntLit, '1')),
        right: exp(a.LitExpr, exp(a.IntLit, '2')),
      }),
      right: exp(a.LitExpr, exp(a.IntLit, '3')),
    }),
    then: exp(a.Block, {
      bodies: [exp(a.LitExpr, exp(a.StrLit, '"hello"'))],
      returnVoid: false,
    }),
    else: exp(a.Block, {
      bodies: [exp(a.LitExpr, exp(a.StrLit, '"world"'))],
      returnVoid: false,
    }),
  }),
);
exprTest(
  `
if 1 + 2 > 3 {
  print("hello, world");
} else {
}
`,
  exp(a.CondExpr, {
    if: exp(a.BinaryExpr, {
      op: exp(a.CompOp, '>'),
      left: exp(a.BinaryExpr, {
        op: exp(a.AddOp, '+'),
        left: exp(a.LitExpr, exp(a.IntLit, '1')),
        right: exp(a.LitExpr, exp(a.IntLit, '2')),
      }),
      right: exp(a.LitExpr, exp(a.IntLit, '3')),
    }),
    then: exp(a.Block, {
      bodies: [
        exp(a.CallExpr, {
          func: exp(a.IdentExpr, exp(a.Ident, 'print')),
          args: exp(a.TupleExpr, {
            size: 1,
            items: [exp(a.LitExpr, exp(a.StrLit, '"hello, world"'))],
          }),
        }),
      ],
      returnVoid: true,
    }),
    else: exp(a.Block, { bodies: [], returnVoid: true }),
  }),
);

exprTest(
  'while x { x * 2 }',
  exp(a.LoopExpr, {
    while: exp(a.IdentExpr, exp(a.Ident, 'x')),
    body: exp(a.Block, {
      bodies: [
        exp(a.BinaryExpr, {
          op: exp(a.MulOp, '*'),
          left: exp(a.IdentExpr, exp(a.Ident, 'x')),
          right: exp(a.LitExpr, exp(a.IntLit, '2')),
        }),
      ],
      returnVoid: false,
    }),
  }),
);
exprTest(
  `
while true {
  if x > 100 {
    break;
  } else {
    x = x + 1;
  }
}
`,
  exp(a.LoopExpr, {
    while: exp(a.LitExpr, exp(a.BoolLit, 'true')),
    body: exp(a.Block, {
      bodies: [
        exp(a.CondExpr, {
          if: exp(a.BinaryExpr, {
            op: exp(a.CompOp, '>'),
            left: exp(a.IdentExpr, exp(a.Ident, 'x')),
            right: exp(a.LitExpr, exp(a.IntLit, '100')),
          }),
          then: exp(a.Block, {
            bodies: [exp(a.Break)],
            returnVoid: true,
          }),
          else: exp(a.Block, {
            bodies: [
              exp(a.Assign, {
                lVal: exp(a.IdentExpr, exp(a.Ident, 'x')),
                expr: exp(a.BinaryExpr, {
                  op: exp(a.AddOp, '+'),
                  left: exp(a.IdentExpr, exp(a.Ident, 'x')),
                  right: exp(a.LitExpr, exp(a.IntLit, '1')),
                }),
              }),
            ],
            returnVoid: true,
          }),
        }),
      ],
      returnVoid: false,
    }),
  }),
);

exprTest(
  `
fn (x int, y int) int {
  let result = x + y;
  result = result + 3;
  result
}
`,
  exp(a.FuncExpr, {
    params: {
      size: 2,
      items: [
        { name: exp(a.Ident, 'x'), type: exp(a.IntType) },
        { name: exp(a.Ident, 'y'), type: exp(a.IntType) },
      ],
    },
    returnType: exp(a.IntType),
    body: exp(a.Block, {
      bodies: [
        exp(a.Decl, {
          name: exp(a.Ident, 'result'),
          type: null,
          expr: exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.IdentExpr, exp(a.Ident, 'x')),
            right: exp(a.IdentExpr, exp(a.Ident, 'y')),
          }),
        }),
        exp(a.Assign, {
          lVal: exp(a.IdentExpr, exp(a.Ident, 'result')),
          expr: exp(a.BinaryExpr, {
            op: exp(a.AddOp, '+'),
            left: exp(a.IdentExpr, exp(a.Ident, 'result')),
            right: exp(a.LitExpr, exp(a.IntLit, '3')),
          }),
        }),
        exp(a.IdentExpr, exp(a.Ident, 'result')),
      ],
      returnVoid: false,
    }),
  }),
);

exprTest(
  `
fn () (bool, int) {
  let result = (true, 1);
  result[1] = 1234;
  result
}
`,
  exp(a.FuncExpr, {
    params: {
      size: 0,
      items: [],
    },
    returnType: exp(a.TupleType, {
      size: 2,
      items: [exp(a.BoolType), exp(a.IntType)],
    }),
    body: exp(a.Block, {
      bodies: [
        exp(a.Decl, {
          name: exp(a.Ident, 'result'),
          type: null,
          expr: exp(a.TupleExpr, {
            size: 2,
            items: [
              exp(a.LitExpr, exp(a.BoolLit, 'true')),
              exp(a.LitExpr, exp(a.IntLit, '1')),
            ],
          }),
        }),
        exp(a.Assign, {
          lVal: exp(a.IndexExpr, {
            target: exp(a.IdentExpr, exp(a.Ident, 'result')),
            index: exp(a.LitExpr, exp(a.IntLit, '1')),
          }),
          expr: exp(a.LitExpr, exp(a.IntLit, '1234')),
        }),
        exp(a.IdentExpr, exp(a.Ident, 'result')),
      ],
      returnVoid: false,
    }),
  }),
);

// new expr
exprTest(
  'new int[10]',
  exp(a.NewExpr, {
    type: exp(a.IntType),
    length: exp(a.LitExpr, exp(a.IntLit, '10')),
  }),
);

console.log(chalk.green.bold('Passed!'));
