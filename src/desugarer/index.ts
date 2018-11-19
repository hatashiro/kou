import * as a from '../parser/ast';
import { Arity1 } from '../util';

class Desugarer {
  constructor(
    private replacer: {
      replaceModule: Arity1<a.Module>;
      replaceImport: Arity1<a.Import>;
      replaceBlock: Arity1<a.Block>;
      replaceLiteral: Arity1<a.Literal<any>>;
      replaceExpr: Arity1<a.Expr<any>>;
      replaceDecl: Arity1<a.Decl>;
      replaceAssign: Arity1<a.Assign>;
      replaceBreak: Arity1<a.Break>;
      replaceIdent: Arity1<a.Ident>;
      replaceBinaryOp: Arity1<a.BinaryOp<any>>;
      replaceUnaryOp: Arity1<a.UnaryOp>;
      replaceType: Arity1<a.Type<any>>;
    },
  ) {}

  desugar(node: a.Module): a.Module {
    node.value.imports = node.value.imports.map(node =>
      this.desugarImport(node),
    );
    node.value.decls = node.value.decls.map(node => this.desugarDecl(node));
    return this.replacer.replaceModule(node);
  }

  desugarImport(node: a.Import): a.Import {
    node.value.path = this.desugarLiteral(node.value.path);
    node.value.elems = node.value.elems.map(elem => ({
      name: this.desugarIdent(elem.name),
      as: elem.as ? this.desugarIdent(elem.as) : elem.as,
    }));
    return this.replacer.replaceImport(node);
  }

  desugarBlock(node: a.Block): a.Block {
    node.value.bodies = node.value.bodies.map(body => {
      if (body instanceof a.Expr) {
        return this.desugarExpr(body);
      } else if (body instanceof a.Decl) {
        return this.desugarDecl(body);
      } else if (body instanceof a.Assign) {
        return this.desugarAssign(body);
      } else {
        return this.desugarBreak(body);
      }
    });
    return this.replacer.replaceBlock(node);
  }

  desugarLiteral(node: a.Literal<any>): a.Literal<any> {
    return this.replacer.replaceLiteral(node);
  }

  desugarExpr(node: a.Expr<any>): a.Expr<any> {
    if (node instanceof a.BinaryExpr) {
      node.value.op = this.desugarBinaryOp(node.value.op);
      node.value.left = this.desugarExpr(node.value.left);
      node.value.right = this.desugarExpr(node.value.right);
    } else if (node instanceof a.UnaryExpr) {
      node.value.op = this.desugarUnaryOp(node.value.op);
      node.value.right = this.desugarExpr(node.value.right);
    } else if (node instanceof a.LitExpr) {
      node.value = this.desugarLiteral(node.value);
    } else if (node instanceof a.IdentExpr) {
      node.value = this.desugarIdent(node.value);
    } else if (node instanceof a.TupleExpr) {
      node.value.items = node.value.items.map(item => this.desugarExpr(item));
    } else if (node instanceof a.ArrayExpr) {
      node.value = node.value.map(item => this.desugarExpr(item));
    } else if (node instanceof a.CallExpr) {
      node.value.func = this.desugarExpr(node.value.func);
      node.value.args = this.desugarExpr(node.value.args);
    } else if (node instanceof a.IndexExpr) {
      node.value.target = this.desugarExpr(node.value.target);
      node.value.index = this.desugarExpr(node.value.index);
    } else if (node instanceof a.FuncExpr) {
      node.value.params.items = node.value.params.items.map(item => {
        const param = {
          name: this.desugarIdent(item.name),
          type: this.desugarType(item.type),
        };
        return param;
      });
      node.value.returnType = this.desugarType(node.value.returnType);
      node.value.body = this.desugarBlock(node.value.body);
    } else if (node instanceof a.CondExpr) {
      node.value.if = this.desugarExpr(node.value.if);
      node.value.then = this.desugarBlock(node.value.then);
      node.value.else = this.desugarBlock(node.value.else);
    } else if (node instanceof a.LoopExpr) {
      node.value.while = this.desugarExpr(node.value.while);
      node.value.body = this.desugarBlock(node.value.body);
    } else if (node instanceof a.NewExpr) {
      node.value.type = this.desugarType(node.value.type);
      node.value.length = this.desugarExpr(node.value.length);
    }
    return this.replacer.replaceExpr(node);
  }

  desugarDecl(node: a.Decl): a.Decl {
    node.value.name = this.desugarIdent(node.value.name);
    if (node.value.type) {
      node.value.type = this.desugarType(node.value.type);
    }
    node.value.expr = this.desugarExpr(node.value.expr);
    return this.replacer.replaceDecl(node);
  }

  desugarAssign(node: a.Assign): a.Assign {
    node.value.lVal = this.desugarExpr(node.value.lVal);
    node.value.expr = this.desugarExpr(node.value.expr);
    return this.replacer.replaceAssign(node);
  }

  desugarBreak(node: a.Break): a.Break {
    return this.replacer.replaceBreak(node);
  }

  desugarIdent(node: a.Ident): a.Ident {
    return this.replacer.replaceIdent(node);
  }

  desugarBinaryOp(node: a.BinaryOp<any>): a.BinaryOp<any> {
    return this.replacer.replaceBinaryOp(node);
  }

  desugarUnaryOp(node: a.UnaryOp): a.UnaryOp {
    return this.replacer.replaceUnaryOp(node);
  }

  desugarType(node: a.Type<any>): a.Type<any> {
    if (node instanceof a.FuncType) {
      node.value.param = this.desugarType(node.value.param);
      node.value.return = this.desugarType(node.value.return);
    } else if (node instanceof a.TupleType) {
      node.value.items = node.value.items.map(item => this.desugarType(item));
    } else if (node instanceof a.ArrayType) {
      node.value = this.desugarType(node.value);
    }
    return this.replacer.replaceType(node);
  }
}

const id = <T>(x: T) => x;

export function desugarBefore(mod: a.Module): a.Module {
  const desugarer = new Desugarer({
    replaceModule: id,
    replaceImport: id,
    replaceBlock: id,
    replaceLiteral: id,
    replaceExpr: unwrap1TupleExpr,
    replaceDecl: id,
    replaceAssign: id,
    replaceBreak: id,
    replaceIdent: id,
    replaceBinaryOp: id,
    replaceUnaryOp: id,
    replaceType: unwrap1TupleType,
  });

  return desugarer.desugar(mod);
}

export function desugarAfter(mod: a.Module): a.Module {
  const desugarer = new Desugarer({
    replaceModule: id,
    replaceImport: id,
    replaceBlock: id,
    replaceLiteral: id,
    replaceExpr: removeUnaryPlus,
    replaceDecl: id,
    replaceAssign: id,
    replaceBreak: id,
    replaceIdent: id,
    replaceBinaryOp: id,
    replaceUnaryOp: id,
    replaceType: id,
  });

  return desugarer.desugar(mod);
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
