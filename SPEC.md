# Kou Language Specification

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
-> , ( ) [ ] { } : = \
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
import as let if then else for in true false
```

### Literals

Integer:

```
decimal_digit = "0" … "9" .
int_lit = ( "1" … "9" ) { decimal_digit } .
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
Type = PrimType | FuncType | TupleType | ListType .
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
TupleType = "(" Type { "," Type } ")" .
```

Semantically, 1-tuple is the same with its inner type, or 1-tuple is desugared
into its inner type.

Related: [TupleExpr](#tupleexpr)

### List type

```
ListType = "[" Type "]" .
```

Related: [ListExpr](#listexpr)

## Program

```
Program = { Import } { Decl } .
```

`{ Decl }` must contain a main function.

```
let main = \ () int {
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
Expr = UnaryExpr | Expr binary_op Expr
UnaryExpr = PrimExpr | unary_op UnaryExpr .
PrimExpr = LitExpr
         | IdentExpr
         | TupleExpr
         | ListExpr
         | BlockExpr
         | FuncExpr
         | CallExpr
         | CondExpr
         | LoopExpr .
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
TupleExpr = "(" Expr { "," Expr } ")" .
```

Semantically, 1-tuple is the same with its inner value, or 1-tuple is desugared
into its inner value.

Related: [Tuple type](#tuple-type)

### ListExpr

```
ListExpr = "[" Expr { "," Expr } "]"
```

Related: [List type](#list-type)

### BlockExpr

```
BlockExpr = "{" { Expr | Decl } Expr "}" .
```

### FuncExpr

```
FuncExpr = "\" ParamTuple Type Expr .
ParamTuple = "(" [ Param { "," Param } ] ")" .
Param = ident Type .
```

### CallExpr

```
CallExpr = PrimExpr TupleExpr .
```

Related: [TupleExpr](#tupleexpr)

### CondExpr

```
CondExpr = "if" Expr "then" Expr "else" Expr
```

### LoopExpr

```
LoopExpr = "for" ident "in" Expr Expr
```
