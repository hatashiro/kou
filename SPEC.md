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

### Literals

*TBD*

### Identifier

*TBD*

### Keywords

*TBD*

### Operators and punctuation

*TBD*

## Types

*TBD*

## Program

```
Program = { Import } { Declaration } .
```

`{ Declaration }` must contain a main function, `main = \ () int { ... }`.

### Import

```
Import = "import" ImportPath
         "(" ImportElem { "," ImportElem } ")" .
ImportPath = string_lit .
ImportElem = ident [ "as" ident ] .
```

### Declaration

```
Declaration = ident "=" Expr .
```

## Expressions

```
Expr = UnaryExpr | Expr binary_op Expr
UnaryExpr = PrimaryExpr | unary_op UnaryExpr .
PrimaryExpr = LitExpr
            | IdentExpr
            | LambdaExpr
            | CallExpr
            | "(" Expr ")".
```

`Expr` stands for *Expression*.

### LitExpr

The name stands for *Literal Expression*.

```
LitExpr = bool_lit | int_lit | float_lit | string_lit | bool_lit .
```

### IdentExpr

The name stands for *Identifier Expression*.

```
IdentExpr = ident .
```

### LambdaExpr

```
LambdaExpr = "\" "(" [ Local { "," Local } ] ")" Type "{" { Expr } "}" .
Local = Parameter | Binding .
Parameter = ident [ ":" Type ]
Binding = Parameter "=" Expr
```

### CallExpr

```
CallExpr = PrimaryExpr "(" Expr { "," Expr } ")" .
```

## Operators

*TBD*
