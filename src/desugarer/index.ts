import * as a from '../parser/ast';
import { visitor } from '../parser/visitor';

export function desugar(mod: a.Module): a.Module {
  const v = visitor({
    visitExpr: desugarExpr,
    visitType: desugarType,
  });

  return v.visitModule(mod);
}

function desugarExpr(node: a.Expr<any>): a.Expr<any> {
  // Unwrap 1-tuple expr
  if (node instanceof a.TupleExpr && node.value.size === 1) {
    return node.value.items[0];
  }

  // Unwrap unary '+' operator
  if (node instanceof a.UnaryExpr && node.value.op.value === '+') {
    return node.value.right;
  }

  return node;
}

function desugarType(node: a.Type<any>): a.Type<any> {
  // Unwrap 1-tuple type
  if (node instanceof a.TupleType && node.value.size === 1) {
    return node.value.items[0];
  }
  return node;
}
