import * as a from '../parser/ast';
import { visitor } from '../parser/visitor';

export function desugarBefore(mod: a.Module): a.Module {
  const v = visitor({
    visitExpr: unwrap1TupleExpr,
    visitType: unwrap1TupleType,
  });

  return v.visitModule(mod);
}

export function desugarAfter(mod: a.Module): a.Module {
  const v = visitor({
    visitExpr: removeUnaryPlus,
  });

  return v.visitModule(mod);
}

function unwrap1TupleExpr(node: a.Expr<any>): a.Expr<any> {
  if (node instanceof a.TupleExpr && node.value.size === 1) {
    return node.value.items[0];
  }
  return node;
}

function unwrap1TupleType(node: a.Type<any>): a.Type<any> {
  if (node instanceof a.TupleType && node.value.size === 1) {
    return node.value.items[0];
  }
  return node;
}

function removeUnaryPlus(node: a.Expr<any>): a.Expr<any> {
  // Remove unary '+' operator
  if (node instanceof a.UnaryExpr && node.value.op.value === '+') {
    return node.value.right;
  }
  return node;
}
