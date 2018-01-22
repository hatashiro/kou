import * as a from './ast';

type Visit<T> = (orig: T, context: Context) => T;

export type Context = {
  enterScope: () => void;
  leaveScope: () => void;
  push: (def: ValDef) => void;
};

export type ValDef = a.Import | a.Decl | a.Param | a.LoopExpr;

export type Visitor = {
  visitModule: Visit<a.Module>;
  visitImport: Visit<a.Import>;
  visitBlock: Visit<a.Block>;
  visitLiteral: Visit<a.Literal<any>>;
  visitExpr: Visit<a.Expr<any>>;
  visitDecl: Visit<a.Decl>;
  visitIdent: Visit<a.Ident>;
  visitBinaryOp: Visit<a.BinaryOp<any>>;
  visitUnaryOp: Visit<a.UnaryOp>;
  visitType: Visit<a.Type<any>>;
};

export type VisitorOptions = { [K in keyof Visitor]?: Visitor[K] };

const constVisit = <T>(orig: T, ctx: Context) => orig;

// factory function for Visitor
export function visitor(opts: VisitorOptions): Visitor {
  const v: Visitor = Object.assign(
    {
      visitModule: constVisit,
      visitImport: constVisit,
      visitBlock: constVisit,
      visitLiteral: constVisit,
      visitExpr: constVisit,
      visitDecl: constVisit,
      visitIdent: constVisit,
      visitBinaryOp: constVisit,
      visitUnaryOp: constVisit,
      visitType: constVisit,
    },
    opts,
  );

  return {
    visitModule(node, ctx) {
      node.value.imports = node.value.imports.map(node =>
        this.visitImport(node, ctx),
      );
      node.value.decls = node.value.decls.map(node =>
        this.visitDecl(node, ctx),
      );
      return v.visitModule(node, ctx);
    },
    visitImport(node, ctx) {
      node.value.path = this.visitLiteral(node.value.path, ctx);
      node.value.elems = node.value.elems.map(elem => ({
        name: this.visitIdent(elem.name, ctx),
        as: elem.as ? this.visitIdent(elem.as, ctx) : elem.as,
      }));
      ctx.push(node);
      return v.visitImport(node, ctx);
    },
    visitBlock(node, ctx) {
      node.value.bodies = node.value.bodies.map(body => {
        if (body instanceof a.Expr) {
          return this.visitExpr(body, ctx);
        } else {
          return this.visitDecl(body, ctx);
        }
      });
      return v.visitBlock(node, ctx);
    },
    visitLiteral(node, ctx) {
      return v.visitLiteral(node, ctx);
    },
    visitExpr(node, ctx) {
      if (node instanceof a.BinaryExpr) {
        node.value.op = this.visitBinaryOp(node.value.op, ctx);
        node.value.left = this.visitExpr(node.value.left, ctx);
        node.value.right = this.visitExpr(node.value.right, ctx);
      } else if (node instanceof a.UnaryExpr) {
        node.value.op = this.visitUnaryOp(node.value.op, ctx);
        node.value.right = this.visitExpr(node.value.right, ctx);
      } else if (node instanceof a.LitExpr) {
        node.value = this.visitLiteral(node.value, ctx);
      } else if (node instanceof a.IdentExpr) {
        node.value = this.visitIdent(node.value, ctx);
      } else if (node instanceof a.TupleExpr) {
        node.value.items = node.value.items.map(item =>
          this.visitExpr(item, ctx),
        );
      } else if (node instanceof a.ListExpr) {
        node.value = node.value.map(item => this.visitExpr(item, ctx));
      } else if (node instanceof a.CallExpr) {
        node.value.func = this.visitExpr(node.value.func, ctx);
        node.value.args = this.visitExpr(node.value.args, ctx);
      } else if (node instanceof a.IndexExpr) {
        node.value.target = this.visitExpr(node.value.target, ctx);
        node.value.index = this.visitExpr(node.value.index, ctx);
      } else if (node instanceof a.FuncExpr) {
        ctx.enterScope();
        node.value.params.items = node.value.params.items.map(item => {
          const param = {
            name: this.visitIdent(item.name, ctx),
            type: this.visitType(item.type, ctx),
          };
          ctx.push(param);
          return param;
        });
        node.value.returnType = this.visitType(node.value.returnType, ctx);
        node.value.body = this.visitBlock(node.value.body, ctx);
        ctx.leaveScope();
      } else if (node instanceof a.CondExpr) {
        node.value.if = this.visitExpr(node.value.if, ctx);
        ctx.enterScope();
        node.value.then = this.visitBlock(node.value.then, ctx);
        ctx.leaveScope();
        ctx.enterScope();
        node.value.else = this.visitBlock(node.value.else, ctx);
        ctx.leaveScope();
      } else if (node instanceof a.LoopExpr) {
        ctx.enterScope();
        node.value.for = this.visitIdent(node.value.for, ctx);
        node.value.in = this.visitExpr(node.value.in, ctx);
        ctx.push(node);
        node.value.do = this.visitBlock(node.value.do, ctx);
        ctx.leaveScope();
      }
      return v.visitExpr(node, ctx);
    },
    visitDecl(node, ctx) {
      node.value.name = this.visitIdent(node.value.name, ctx);
      if (node.value.type) {
        node.value.type = this.visitType(node.value.type, ctx);
      }
      ctx.push(node); // this should be called before visitExpr for recursion
      node.value.expr = this.visitExpr(node.value.expr, ctx);
      return v.visitDecl(node, ctx);
    },
    visitIdent(node, ctx) {
      return v.visitIdent(node, ctx);
    },
    visitBinaryOp(node, ctx) {
      return v.visitBinaryOp(node, ctx);
    },
    visitUnaryOp(node, ctx) {
      return v.visitUnaryOp(node, ctx);
    },
    visitType(node, ctx) {
      if (node instanceof a.FuncType) {
        node.value.param = this.visitType(node.value.param, ctx);
        node.value.return = this.visitType(node.value.return, ctx);
      } else if (node instanceof a.TupleType) {
        node.value.items = node.value.items.map(item =>
          this.visitType(item, ctx),
        );
      } else if (node instanceof a.ListType) {
        node.value = this.visitType(node.value, ctx);
      }
      return v.visitType(node, ctx);
    },
  };
}
