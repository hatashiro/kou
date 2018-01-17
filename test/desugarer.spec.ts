import * as chalk from 'chalk';
import * as a from '../src/parser/ast';
import { desugar } from '../src/desugarer';

function n<T>(Node: a.NodeConstructor<T>, value: T): a.Node<T> {
  // -1, -1 for testing
  return new Node(value, -1, -1);
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

function moduleDesugarTest(
  description: string,
  input: a.Module,
  expected: a.Module,
) {
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

function declDesugarTest(description: string, input: a.Decl, expected: a.Decl) {
  moduleDesugarTest(
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
  description: string,
  input: a.Expr<any>,
  expected: a.Expr<any>,
) {
  declDesugarTest(
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
  'No desugar',
  n(a.LitExpr, n(a.IntLit, '1')),
  n(a.LitExpr, n(a.IntLit, '1')),
);

console.log(chalk.green.bold('Desugarer tests passed'));
