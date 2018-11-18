# kou Language Specification

* [Introduction](#introduction)
* [Notation](#notation)
* [Lexical elements](#lexical-elements)
  + [Punctuation](#punctuation)
  + [Operators](#operators)
  + [Keywords](#keywords)
  + [Literals](#literals)
  + [Identifier](#identifier)
* [Types](#types)
  + [Primary types](#primary-types)
  + [Function type](#function-type)
  + [Tuple type](#tuple-type)
  + [Array type](#array-type)
  + [Void type](#void-type)
* [Module](#module)
  + [Import](#import)
* [Declaration](#declaration)
* [Expressions](#expressions)
  + [LitExpr](#litexpr)
  + [IdentExpr](#identexpr)
  + [TupleExpr](#tupleexpr)
  + [ArrayExpr](#arrayexpr)
  + [CallExpr](#callexpr)
  + [IndexExpr](#indexexpr)
  + [FuncExpr](#funcexpr)
  + [CondExpr](#condexpr)
  + [LoopExpr](#loopexpr)
  + [NewExpr](#newexpr)
* [Assignment](#assignment)
* [Block](#block)

## Introduction

This document is a language specification (yet informal) of the kou programming
language.

## Notation

The syntax is specified using Extended Backus-Naur Form (EBNF).

```
|   alternation
()  grouping
[]  option (0 or 1 times)
{}  repetition (0 to n times)
```

Lower-case production names are used to identify lexical tokens. Non-terminals
are in CamelCase. Lexical tokens are enclosed in double quotes "".

## Lexical elements

### Punctuation

```
-> , ( ) [ ] { } : = ;
```

### Operators

Unary:

```
unary_op = "+" | "-" | "!" .
```

Binary:

```
binary_op = rel_op | add_op | mul_op | bool_op .
rel_op = "==" | "!=" | "<" | "<=" | ">" | ">=" .
add_op = "+" | "-" | "|" | "^" .
mul_op = "*" | "/" | "%" | "&" .
bool_op = "||" | "&&" .
```

### Keywords

```
import as let fn if else for in new
```

### Literals

Integer:

```
decimal_digit = "0" … "9" .
int_lit = decimal_digit { decimal_digit } .
```

Float:

```
decimals  = decimal_digit { decimal_digit } .
float_lit = decimals "." [ decimals ]
          | "." decimals
```

Char:

```
escaped_char = "\" ( "n" | "r" | "t" | "\" | "'" | """ ) .
char = unicode_char | escaped_char .
char_lit = "'" ( char ) "'"
```

String:

```
string_lit = """ { char } """ .
```

Boolean:

```
bool_lit = "true" | "false"
```

### Identifier

```
lower_letter = "a" … "z" .
letter = lower_letter | "_" .
ident = letter { letter | decimal_digit } .
```

## Types

```
Type = PrimType | FuncType | TupleType | ArrayType | VoidType .
```

### Primary types

```
PrimType = "int" | "float" | "str" | "bool" | "char" .
```

### Function type

```
FuncType = Type "->" Type .
```

### Tuple type

```
TupleType = "(" [ Type { "," Type } ] ")" .
```

Semantically, 1-tuple is the same with its inner type, or 1-tuple is desugared
into its inner type.

Related: [TupleExpr](#tupleexpr)

### Array type

```
ArrayType = "[" Type "]" .
```

Related: [ArrayExpr](#arrayexpr)

### Void type

```
VoidType = "void" .
```

Void type does not have a value. Any actual value in the type of `"void"`
should result in a semantic error.

## Module

Each file in kou is represented as a module.

```
Module = { Import } { Decl } .
```

### Import

```
Import = "import" ImportPath
         "(" ImportElem { "," ImportElem } ")" .
ImportPath = string_lit .
ImportElem = ident [ "as" ident ] .
```

## Declaration

```
Decl = "let" ident [ ":" Type ] "=" Expr .
```

## Expressions

```
Expr = PrimUnaryExpr | BinaryExpr .
BinaryExpr = Expr binary_op Expr .
PrimUnaryExpr = PrimExpr | UnaryExpr .
UnaryExpr = unary_op PrimUnaryExpr
PrimExpr = LitExpr
         | IdentExpr
         | TupleExpr
         | ArrayExpr
         | CallExpr
         | FuncExpr
         | CondExpr
         | LoopExpr
         | NewExpr.
```

`Expr` stands for *Expression*.

### LitExpr

The name stands for *Literal Expression*.

```
LitExpr = int_lit | float_lit | string_lit | bool_lit | char_lit .
```

### IdentExpr

The name stands for *Identifier Expression*.

```
IdentExpr = ident .
```

### TupleExpr

```
TupleExpr = "(" [ Expr { "," Expr } ] ")" .
```

Semantically, 1-tuple is the same with its inner value, or 1-tuple is desugared
into its inner value.

Related: [Tuple type](#tuple-type)

### ArrayExpr

```
ArrayExpr = "[" Expr { "," Expr } "]"
```

Related: [Array type](#array-type)

### CallExpr

```
CallExpr = PrimExpr TupleExpr .
```

Related: [TupleExpr](#tupleexpr)

### IndexExpr

```
IndexExpr = PrimExpr "[" Expr "]" .
```

It can be used to retrieve an element from an array or a tuple.

For the tuple case, the index should be a `LitExpr` having `int_lit`, with a
value in the tuple's size range.

Related: [Literals](#literals)

### FuncExpr

```
FuncExpr = "fn" ParamTuple Type Block .
ParamTuple = "(" [ Param { "," Param } ] ")" .
Param = ident Type .
```

Related: [Block](#block)

### CondExpr

```
CondExpr = "if" Expr Block "else" Block .
```

Related: [Block](#block)

### LoopExpr

```
LoopExpr = "for" ident "in" Expr Block .
```

Related: [Block](#block)

### NewExpr

```
NewExpr = "new" Type "[" Expr "]" .
```

It creates an array with a specified size.

Related:

- [Array type](#array-type)
- [ArrayExpr](#arrayexpr)

## Assignment

```
Assign = LVal "=" Expr .
```

### LVal

```
LVal = IdentExpr
     | IndexExpr .
```

Related:

- [IdentExpr](#identexpr)
- [IndexExpr](#indexexpr)

## Block

```
Block = "{" { ( Expr | Decl | Assign ) ";" } [ Expr ] "}" .
```

A block ending without `Expr` (no `";"`) has its return type as `void`, and it
is the only way to express `void` type in kou.

Related: [Void type](#void-type)
