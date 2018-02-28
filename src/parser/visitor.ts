import * as a from './ast';
import { Arity1 } from '../util';

export type Visitor = {
  visitModule: Arity1<a.Module>;
  visitImport: Arity1<a.Import>;
  visitBlock: Arity1<a.Block>;
  visitLiteral: Arity1<a.Literal<any>>;
  visitExpr: Arity1<a.Expr<any>>;
  visitDecl: Arity1<a.Decl>;
  visitIdent: Arity1<a.Ident>;
  visitBinaryOp: Arity1<a.BinaryOp<any>>;
  visitUnaryOp: Arity1<a.UnaryOp>;
  visitType: Arity1<a.Type<any>>;

  beforeVisitModule: Arity1<a.Module>;
  beforeVisitImport: Arity1<a.Import>;
  beforeVisitBlock: Arity1<a.Block>;
  beforeVisitLiteral: Arity1<a.Literal<any>>;
  beforeVisitExpr: Arity1<a.Expr<any>>;
  beforeVisitDecl: Arity1<a.Decl>;
  beforeVisitIdent: Arity1<a.Ident>;
  beforeVisitBinaryOp: Arity1<a.BinaryOp<any>>;
  beforeVisitUnaryOp: Arity1<a.UnaryOp>;
  beforeVisitType: Arity1<a.Type<any>>;
};

export type VisitorOptions = {
  [K in keyof Visitor]?: Visitor[K] extends Arity1<infer T>
    ? Arity1<T, T | void>
    : never
};

const wrapOption = <T>(f?: Arity1<T, T | void>): Arity1<T> =>
  f ? (x: T) => f(x) || x : (x: T) => x;

// factory function for Visitor
export function visitor(opts: VisitorOptions): Visitor {
  const v: Visitor = {
    visitModule: wrapOption(opts.visitModule),
    visitImport: wrapOption(opts.visitImport),
    visitBlock: wrapOption(opts.visitBlock),
    visitLiteral: wrapOption(opts.visitLiteral),
    visitExpr: wrapOption(opts.visitExpr),
    visitDecl: wrapOption(opts.visitDecl),
    visitIdent: wrapOption(opts.visitIdent),
    visitBinaryOp: wrapOption(opts.visitBinaryOp),
    visitUnaryOp: wrapOption(opts.visitUnaryOp),
    visitType: wrapOption(opts.visitType),

    beforeVisitModule: wrapOption(opts.beforeVisitModule),
    beforeVisitImport: wrapOption(opts.beforeVisitImport),
    beforeVisitBlock: wrapOption(opts.beforeVisitBlock),
    beforeVisitLiteral: wrapOption(opts.beforeVisitLiteral),
    beforeVisitExpr: wrapOption(opts.beforeVisitExpr),
    beforeVisitDecl: wrapOption(opts.beforeVisitDecl),
    beforeVisitIdent: wrapOption(opts.beforeVisitIdent),
    beforeVisitBinaryOp: wrapOption(opts.beforeVisitBinaryOp),
    beforeVisitUnaryOp: wrapOption(opts.beforeVisitUnaryOp),
    beforeVisitType: wrapOption(opts.beforeVisitType),
  };

  return {
    visitModule(node) {
      v.beforeVisitModule(node);
      node.value.imports = node.value.imports.map(node =>
        this.visitImport(node),
      );
      node.value.decls = node.value.decls.map(node => this.visitDecl(node));
      return v.visitModule(node);
    },
    visitImport(node) {
      v.beforeVisitImport(node);
      node.value.path = this.visitLiteral(node.value.path);
      node.value.elems = node.value.elems.map(elem => ({
        name: this.visitIdent(elem.name),
        as: elem.as ? this.visitIdent(elem.as) : elem.as,
      }));
      return v.visitImport(node);
    },
    visitBlock(node) {
      v.beforeVisitBlock(node);
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
      v.beforeVisitLiteral(node);
      return v.visitLiteral(node);
    },
    visitExpr(node) {
      v.beforeVisitExpr(node);
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
        node.value.params.items = node.value.params.items.map(item => {
          const param = {
            name: this.visitIdent(item.name),
            type: this.visitType(item.type),
          };
          return param;
        });
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
      v.beforeVisitDecl(node);
      node.value.name = this.visitIdent(node.value.name);
      if (node.value.type) {
        node.value.type = this.visitType(node.value.type);
      }
      node.value.expr = this.visitExpr(node.value.expr);
      return v.visitDecl(node);
    },
    visitIdent(node) {
      v.beforeVisitIdent(node);
      return v.visitIdent(node);
    },
    visitBinaryOp(node) {
      v.beforeVisitBinaryOp(node);
      return v.visitBinaryOp(node);
    },
    visitUnaryOp(node) {
      v.beforeVisitUnaryOp(node);
      return v.visitUnaryOp(node);
    },
    visitType(node) {
      v.beforeVisitType(node);
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

    beforeVisitModule: v.beforeVisitModule,
    beforeVisitImport: v.beforeVisitImport,
    beforeVisitBlock: v.beforeVisitBlock,
    beforeVisitLiteral: v.beforeVisitLiteral,
    beforeVisitExpr: v.beforeVisitExpr,
    beforeVisitDecl: v.beforeVisitDecl,
    beforeVisitIdent: v.beforeVisitIdent,
    beforeVisitBinaryOp: v.beforeVisitBinaryOp,
    beforeVisitUnaryOp: v.beforeVisitUnaryOp,
    beforeVisitType: v.beforeVisitType,
  };
}
