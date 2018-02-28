#!/usr/bin/env bash
git submodule update --init
cd wabt
make gcc-release
