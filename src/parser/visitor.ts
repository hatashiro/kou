import * as a from './ast';

type Mapper<T> = (orig: T) => T;

export type Visitor = {
  visitModule: Mapper<a.Module>;
  visitImport: Mapper<a.Import>;
  visitBlock: Mapper<a.Block>;
  visitLiteral: Mapper<a.Literal<any>>;
  visitExpr: Mapper<a.Expr<any>>;
  visitDecl: Mapper<a.Decl>;
  visitIdent: Mapper<a.Ident>;
  visitBinaryOp: Mapper<a.BinaryOp<any>>;
  visitUnaryOp: Mapper<a.UnaryOp>;
  visitType: Mapper<a.Type<any>>;
};

export type VisitorOptions = { [K in keyof Visitor]?: Visitor[K] };

const id = <T>(orig: T) => orig;

// factory function for Visitor
export function visitor(opts: VisitorOptions): Visitor {
  const v: Visitor = Object.assign(
    {
      visitModule: id,
      visitImport: id,
      visitBlock: id,
      visitLiteral: id,
      visitExpr: id,
      visitDecl: id,
      visitIdent: id,
      visitBinaryOp: id,
      visitUnaryOp: id,
      visitType: id,
    },
    opts,
  );

  return {
    visitModule(node) {
      node.value.imports = node.value.imports.map(node =>
        this.visitImport(node),
      );
      node.value.decls = node.value.decls.map(node => this.visitDecl(node));
      return v.visitModule(node);
    },
    visitImport(node) {
      node.value.path = this.visitLiteral(node.value.path);
      node.value.elems = node.value.elems.map(elem => ({
        name: this.visitIdent(elem.name),
        as: elem.as ? this.visitIdent(elem.as) : elem.as,
      }));
      return v.visitImport(node);
    },
    visitBlock(node) {
      node.value.bodies = node.value.bodies.map(body => {
        if (body instanceof a.Expr) {
          return this.visitExpr(body);
        } else {
          return this.visitDecl(body);
        }
      });
      return v.visitBlock(node);
    },
    visitLiteral(node) {
      return v.visitLiteral(node);
    },
    visitExpr(node) {
      if (node instanceof a.BinaryExpr) {
        node.value.op = this.visitBinaryOp(node.value.op);
        node.value.left = this.visitExpr(node.value.left);
        node.value.right = this.visitExpr(node.value.right);
      } else if (node instanceof a.UnaryExpr) {
        node.value.op = this.visitUnaryOp(node.value.op);
        node.value.right = this.visitExpr(node.value.right);
      } else if (node instanceof a.LitExpr) {
        node.value = this.visitLiteral(node.value);
      } else if (node instanceof a.IdentExpr) {
        node.value = this.visitIdent(node.value);
      } else if (node instanceof a.TupleExpr) {
        node.value.items = node.value.items.map(item => this.visitExpr(item));
      } else if (node instanceof a.ListExpr) {
        node.value = node.value.map(item => this.visitExpr(item));
      } else if (node instanceof a.CallExpr) {
        node.value.func = this.visitExpr(node.value.func);
        node.value.args = this.visitExpr(node.value.args);
      } else if (node instanceof a.IndexExpr) {
        node.value.target = this.visitExpr(node.value.target);
        node.value.index = this.visitExpr(node.value.index);
      } else if (node instanceof a.FuncExpr) {
        node.value.params.items = node.value.params.items.map(item => ({
          name: this.visitIdent(item.name),
          type: this.visitType(item.type),
        }));
        node.value.returnType = this.visitType(node.value.returnType);
        node.value.body = this.visitBlock(node.value.body);
      } else if (node instanceof a.CondExpr) {
        node.value.if = this.visitExpr(node.value.if);
        node.value.then = this.visitBlock(node.value.then);
        node.value.else = this.visitBlock(node.value.else);
      } else if (node instanceof a.LoopExpr) {
        node.value.for = this.visitIdent(node.value.for);
        node.value.in = this.visitExpr(node.value.in);
        node.value.do = this.visitBlock(node.value.do);
      }
      return v.visitExpr(node);
    },
    visitDecl(node) {
      node.value.name = this.visitIdent(node.value.name);
      if (node.value.type) {
        node.value.type = this.visitType(node.value.type);
      }
      node.value.expr = this.visitExpr(node.value.expr);
      return v.visitDecl(node);
    },
    visitIdent(node) {
      return v.visitIdent(node);
    },
    visitBinaryOp(node) {
      return v.visitBinaryOp(node);
    },
    visitUnaryOp(node) {
      return v.visitUnaryOp(node);
    },
    visitType(node) {
      if (node instanceof a.FuncType) {
        node.value.param = this.visitType(node.value.param);
        node.value.return = this.visitType(node.value.return);
      } else if (node instanceof a.TupleType) {
        node.value.items = node.value.items.map(item => this.visitType(item));
      } else if (node instanceof a.ListType) {
        node.value = this.visitType(node.value);
      }
      return v.visitType(node);
    },
  };
}
