# Kou Language Specification

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
  + [List type](#list-type)
  + [Void type](#void-type)
* [Program](#program)
* [Module](#module)
  + [Import](#import)
* [Declaration](#declaration)
* [Expressions](#expressions)
  + [LitExpr](#litexpr)
  + [IdentExpr](#identexpr)
  + [TupleExpr](#tupleexpr)
  + [ListExpr](#listexpr)
  + [FuncExpr](#funcexpr)
  + [CallExpr](#callexpr)
  + [CondExpr](#condexpr)
  + [LoopExpr](#loopexpr)
* [Block](#block)

## Introduction

This document is a language specification (yet informal) of the Kou programming
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
import as let fn if then else for in
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
Type = PrimType | FuncType | TupleType | ListType | VoidType .
```

### Primary types

```
PrimType = "int" | "float" | "string" | "boolean" | "char" .
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

### List type

```
ListType = "[" Type "]" .
```

Related: [ListExpr](#listexpr)

### Void type

```
VoidType = "void" .
```

Void type does not have a value. Any actual value in the type of `"void"`
should result in a semantic error.

## Program

```
Program = { Import } { Decl } .
```

`{ Decl }` must contain a main function.

```
let main = fn () void {
  ...
}
```

## Module

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
Expr = NonBinaryExpr | BinaryExpr .
BinaryExpr = Expr binary_op Expr .
NonBinaryExpr = KeywordExprExpr | PrimExpr | UnaryExpr .
UnaryExpr = unary_op NonBinaryExpr
KeywordExpr = FuncExpr
            | CondExpr
            | LoopExpr .
PrimExpr = LitExpr
         | IdentExpr
         | TupleExpr
         | ListExpr
         | CallExpr .
```

`Expr` stands for *Expression*.

### FuncExpr

```
FuncExpr = "fn" ParamTuple Type ( Expr | Block ) .
ParamTuple = "(" [ Param { "," Param } ] ")" .
Param = ident Type .
```

Related: [Block](#block)

### CondExpr

```
CondExpr = "if" Expr "then" ( Expr | Block ) "else" ( Expr | Block )
```

Related: [Block](#block)

### LoopExpr

```
LoopExpr = "for" ident "in" Expr ( Expr | Block )
```

Related: [Block](#block)

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

### ListExpr

```
ListExpr = "[" Expr { "," Expr } "]"
```

Related: [List type](#list-type)

### CallExpr

```
CallExpr = PrimExpr TupleExpr .
```

Related: [TupleExpr](#tupleexpr)

## Block

```
Block = "{" { ( Expr | Decl ) ";" } [ Expr ] "}" .
```

A block ending without `Expr` (no `";"`) has its return type as `void`, and it
is the only way to express `void` type in Kou.

Related: [Void type](#void-type)
