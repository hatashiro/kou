import chalk from 'chalk';
import * as a from '../src/parser/ast';
import { desugarBefore, desugarAfter } from '../src/desugarer';

console.log(chalk.bold('Running desugarer tests...'));

function n(Cons: a.NodeConstructor<any, any>, value: any): a.Node<any> {
  return new Cons(value, -1, -1);
}

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

function astEqual<T>(actual: a.Node<T>, expected?: a.Node<T>) {
  if (
    expected &&
    actual.constructor === expected.constructor &&
    valueEqual(actual.value, expected.value)
  ) {
    return;
  }

  throw new Error(
    `Expected ${
      expected
        ? `${expected.constructor.name}(${JSON.stringify(expected.value)})`
        : 'undefined'
    }, found ${actual.constructor.name}(${JSON.stringify(actual.value)})`,
  );
}

type DesugarPath = 'before' | 'after' | 'both';

function moduleDesugarTest(
  path: DesugarPath,
  description: string,
  input: a.Module,
  expected: a.Module,
) {
  let desugar: (input: a.Module) => a.Module;
  switch (path) {
    case 'before':
      desugar = desugarBefore;
      break;
    case 'after':
      desugar = desugarAfter;
      break;
    case 'both':
      desugar = x => desugarAfter(desugarBefore(x));
      break;
    default:
      throw new Error('unreachable');
  }

  try {
    astEqual(desugar(input), expected);
  } catch (err) {
    console.error(chalk.blue.bold('Test:'));
    console.error(description);
    console.error();
    console.error(chalk.red.bold('Error:'));
    console.error(err);
    process.exit(1);
  }
}

moduleDesugarTest(
  'both',
  'No desugar',
  n(a.Module, {
    imports: [],
    decls: [],
  }),
  n(a.Module, {
    imports: [],
    decls: [],
  }),
);

function declDesugarTest(
  path: DesugarPath,
  description: string,
  input: a.Decl,
  expected: a.Decl,
) {
  moduleDesugarTest(
    path,
    description,
    n(a.Module, {
      imports: [],
      decls: [input],
    }),
    n(a.Module, {
      imports: [],
      decls: [expected],
    }),
  );
}

declDesugarTest(
  'both',
  'No desugar',
  n(a.Decl, {
    name: n(a.Ident, 'x'),
    type: null,
    expr: n(a.LitExpr, n(a.IntLit, '1')),
  }),
  n(a.Decl, {
    name: n(a.Ident, 'x'),
    type: null,
    expr: n(a.LitExpr, n(a.IntLit, '1')),
  }),
);

function exprDesugarTest(
  path: DesugarPath,
  description: string,
  input: a.Expr<any>,
  expected: a.Expr<any>,
) {
  declDesugarTest(
    path,
    description,
    n(a.Decl, {
      name: n(a.Ident, 'x'),
      type: null,
      expr: input,
    }),
    n(a.Decl, {
      name: n(a.Ident, 'x'),
      type: null,
      expr: expected,
    }),
  );
}

exprDesugarTest(
  'both',
  'No desugar',
  n(a.LitExpr, n(a.IntLit, '1')),
  n(a.LitExpr, n(a.IntLit, '1')),
);

exprDesugarTest(
  'before',
  'Unwrap 1-tuple',
  n(a.TupleExpr, { size: 1, items: [n(a.LitExpr, n(a.IntLit, '123'))] }),
  n(a.LitExpr, n(a.IntLit, '123')),
);

exprDesugarTest(
  'before',
  'Unwrap 1-tuple multiple times',
  n(a.TupleExpr, {
    size: 1,
    items: [
      n(a.TupleExpr, {
        size: 1,
        items: [
          n(a.TupleExpr, {
            size: 1,
            items: [n(a.LitExpr, n(a.IntLit, '123'))],
          }),
        ],
      }),
    ],
  }),
  n(a.LitExpr, n(a.IntLit, '123')),
);

exprDesugarTest(
  'before',
  'Unwrap 1-tuple with binary operator 1',
  n(a.BinaryExpr, {
    op: n(a.MulOp, '*'),
    left: n(a.LitExpr, n(a.IntLit, '1')),
    right: n(a.TupleExpr, {
      size: 1,
      items: [
        n(a.BinaryExpr, {
          op: n(a.AddOp, '+'),
          left: n(a.LitExpr, n(a.IntLit, '2')),
          right: n(a.LitExpr, n(a.IntLit, '3')),
        }),
      ],
    }),
  }),
  n(a.BinaryExpr, {
    op: n(a.MulOp, '*'),
    left: n(a.LitExpr, n(a.IntLit, '1')),
    right: n(a.BinaryExpr, {
      op: n(a.AddOp, '+'),
      left: n(a.LitExpr, n(a.IntLit, '2')),
      right: n(a.LitExpr, n(a.IntLit, '3')),
    }),
  }),
);

exprDesugarTest(
  'before',
  'Unwrap 1-tuple with binary operator 2',
  n(a.BinaryExpr, {
    op: n(a.AddOp, '+'),
    left: n(a.LitExpr, n(a.IntLit, '1')),
    right: n(a.TupleExpr, {
      size: 1,
      items: [
        n(a.BinaryExpr, {
          op: n(a.MulOp, '*'),
          left: n(a.LitExpr, n(a.IntLit, '2')),
          right: n(a.LitExpr, n(a.IntLit, '3')),
        }),
      ],
    }),
  }),
  n(a.BinaryExpr, {
    op: n(a.AddOp, '+'),
    left: n(a.LitExpr, n(a.IntLit, '1')),
    right: n(a.BinaryExpr, {
      op: n(a.MulOp, '*'),
      left: n(a.LitExpr, n(a.IntLit, '2')),
      right: n(a.LitExpr, n(a.IntLit, '3')),
    }),
  }),
);

exprDesugarTest(
  'after',
  'Unwrap unary + operator',
  n(a.UnaryExpr, {
    op: n(a.UnaryOp, '+'),
    right: n(a.LitExpr, n(a.IntLit, '1')),
  }),
  n(a.LitExpr, n(a.IntLit, '1')),
);
exprDesugarTest(
  'after',
  'Unwrap multiple + operator',
  n(a.UnaryExpr, {
    op: n(a.UnaryOp, '+'),
    right: n(a.UnaryExpr, {
      op: n(a.UnaryOp, '-'),
      right: n(a.UnaryExpr, {
        op: n(a.UnaryOp, '+'),
        right: n(a.UnaryExpr, {
          op: n(a.UnaryOp, '+'),
          right: n(a.UnaryExpr, {
            op: n(a.UnaryOp, '-'),
            right: n(a.LitExpr, n(a.IntLit, '1')),
          }),
        }),
      }),
    }),
  }),
  n(a.UnaryExpr, {
    op: n(a.UnaryOp, '-'),
    right: n(a.UnaryExpr, {
      op: n(a.UnaryOp, '-'),
      right: n(a.LitExpr, n(a.IntLit, '1')),
    }),
  }),
);

function typeDesugarTest(
  path: DesugarPath,
  description: string,
  input: a.Type<any>,
  expected: a.Type<any>,
) {
  declDesugarTest(
    path,
    description,
    n(a.Decl, {
      name: n(a.Ident, 'x'),
      type: input,
      expr: n(a.Ident, 'y'),
    }),
    n(a.Decl, {
      name: n(a.Ident, 'x'),
      type: expected,
      expr: n(a.Ident, 'y'),
    }),
  );
}

typeDesugarTest('before', 'No desugar', n(a.IntType, null), n(a.IntType, null));

typeDesugarTest(
  'before',
  'Unwrap 1-tuple type',
  n(a.TupleType, { size: 1, items: [n(a.IntType, null)] }),
  n(a.IntType, null),
);

typeDesugarTest(
  'before',
  'Unwrap 1-tuple type multiple times',
  n(a.TupleType, {
    size: 1,
    items: [
      n(a.TupleType, {
        size: 1,
        items: [
          n(a.TupleType, {
            size: 1,
            items: [n(a.IntType, null)],
          }),
        ],
      }),
    ],
  }),
  n(a.IntType, null),
);

declDesugarTest(
  'both',
  'Complex case',
  n(a.Decl, {
    name: n(a.Ident, 'x'),
    type: n(a.FuncType, {
      param: n(a.TupleType, {
        size: 3,
        items: [
          n(a.StrType, null),
          n(
            a.ListType,
            n(a.TupleType, {
              size: 1,
              items: [
                n(a.TupleType, {
                  size: 1,
                  items: [n(a.BoolType, null)],
                }),
              ],
            }),
          ),
          n(a.FuncType, {
            param: n(a.TupleType, {
              size: 1,
              items: [n(a.CharType, null)],
            }),
            return: n(a.StrType, null),
          }),
        ],
      }),
      return: n(a.FuncType, {
        param: n(a.IntType, null),
        return: n(a.TupleType, {
          size: 2,
          items: [
            n(a.TupleType, { size: 1, items: [n(a.IntType, null)] }),
            n(a.TupleType, { size: 1, items: [n(a.IntType, null)] }),
          ],
        }),
      }),
    }),
    expr: n(a.FuncExpr, {
      params: {
        size: 2,
        items: [
          {
            name: n(a.Ident, 'x'),
            type: n(a.TupleType, { size: 1, items: [n(a.IntType, null)] }),
          },
          { name: n(a.Ident, 'y'), type: n(a.IntType, null) },
        ],
      },
      returnType: n(a.TupleType, {
        size: 1,
        items: [
          n(a.TupleType, {
            size: 1,
            items: [n(a.TupleType, { size: 1, items: [n(a.IntType, null)] })],
          }),
        ],
      }),
      body: n(a.Block, {
        bodies: [
          n(a.BinaryExpr, {
            op: n(a.MulOp, '*'),
            left: n(a.UnaryExpr, {
              op: n(a.UnaryOp, '+'),
              right: n(a.LitExpr, n(a.IntLit, '1')),
            }),
            right: n(a.TupleExpr, {
              size: 1,
              items: [
                n(a.BinaryExpr, {
                  op: n(a.AddOp, '+'),
                  left: n(a.IdentExpr, n(a.Ident, 'x')),
                  right: n(a.IdentExpr, n(a.Ident, 'y')),
                }),
              ],
            }),
          }),
        ],
        returnVoid: false,
      }),
    }),
  }),
  n(a.Decl, {
    name: n(a.Ident, 'x'),
    type: n(a.FuncType, {
      param: n(a.TupleType, {
        size: 3,
        items: [
          n(a.StrType, null),
          n(a.ListType, n(a.BoolType, null)),
          n(a.FuncType, {
            param: n(a.CharType, null),
            return: n(a.StrType, null),
          }),
        ],
      }),
      return: n(a.FuncType, {
        param: n(a.IntType, null),
        return: n(a.TupleType, {
          size: 2,
          items: [n(a.IntType, null), n(a.IntType, null)],
        }),
      }),
    }),
    expr: n(a.FuncExpr, {
      params: {
        size: 2,
        items: [
          {
            name: n(a.Ident, 'x'),
            type: n(a.IntType, null),
          },
          { name: n(a.Ident, 'y'), type: n(a.IntType, null) },
        ],
      },
      returnType: n(a.IntType, null),
      body: n(a.Block, {
        bodies: [
          n(a.BinaryExpr, {
            op: n(a.MulOp, '*'),
            left: n(a.LitExpr, n(a.IntLit, '1')),
            right: n(a.BinaryExpr, {
              op: n(a.AddOp, '+'),
              left: n(a.IdentExpr, n(a.Ident, 'x')),
              right: n(a.IdentExpr, n(a.Ident, 'y')),
            }),
          }),
        ],
        returnVoid: false,
      }),
    }),
  }),
);

console.log(chalk.green.bold('Passed!'));
