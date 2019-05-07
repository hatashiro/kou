#!/usr/bin/env bash
git clone --branch 1.0.10 --depth 1 https://github.com/WebAssembly/wabt.git
cd wabt
git submodule update --init
make gcc-release
