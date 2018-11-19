# kou

A minimal language compiled into wasm bytecode

[![npm](https://img.shields.io/npm/v/kou.svg?style=flat-square)](https://www.npmjs.com/package/kou)
[![Travis](https://img.shields.io/travis/utatti/kou.svg?style=flat-square)](https://travis-ci.org/utatti/kou)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

## Language specification

Please refer to [SPEC.md](SPEC.md).

## Demonstration

[![asciicast](https://asciinema.org/a/tP2sldS271HxxsKwWJ2RJdTHL.png)](https://asciinema.org/a/tP2sldS271HxxsKwWJ2RJdTHL)

## Milestones

- [x] Tokenizer
- [x] Parser
- [x] Desugarer
- [x] Type checker
- [x] Code generator for wasm
  - [x] Basic codegen
  - [x] Complex types and expressions
  - [ ] [Codegen for string](https://github.com/utatti/kou/issues/1)
- [ ] Module system
- [ ] JS interop
- [ ] IO
- [ ] Bootstrapping

## Install

``` shell
npm i -g kou
```

## Usage

Compile:

``` shell
kouc hello.kou -o hello.wasm

# For the detailed usage
kouc --help
```

Run in CLI:

``` shell
kou hello.wasm

# For the detailed usage
kou --help
```

## Reference

- [WebAssembly Specification](https://webassembly.github.io/spec/core/index.html)
- [WebAssembly Reference Manual](https://github.com/sunfishcode/wasm-reference-manual/blob/master/WebAssembly.md)
- [The Go Programming Language Specification](https://golang.org/ref/spec)

## License

[MIT](LICENSE)
