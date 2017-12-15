import { tokenize } from '../src/lexer';

// FIXME
for (const token of tokenize('hello')) {
  console.log(token);
}
