#!/usr/bin/env bash
git submodule update --init
cd wabt
git submodule update --init
make gcc-release
