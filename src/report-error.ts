import chalk from 'chalk';
import { LexError } from './lexer/error';
import { ParseError } from './parser/error';
import { TypeError } from './typechecker/error';

export function exitWithErrors(errors: Array<string>) {
  errors.forEach(err => console.error(err));
  process.exit(1);
}

export function reportCompileError(
  input: string,
  err: LexError | ParseError | TypeError | any,
) {
  if (
    !(
      err instanceof LexError ||
      err instanceof ParseError ||
      err instanceof TypeError
    )
  ) {
    throw err;
  }

  const errors: Array<string> = [];

  errors.push(`${err.name}: ${err.message}\n`);

  const lineIdx = err.row - 1;
  const fromIdx = lineIdx < 1 ? 0 : lineIdx - 1;
  const toIdx = lineIdx + 2;
  const targetIdx = lineIdx - fromIdx;

  const lineNoDigitLen = toIdx.toString().length;

  input
    .split('\n')
    .slice(fromIdx, toIdx)
    .forEach((line, idx) => {
      const lineNo = fromIdx + idx + 1;
      errors.push(
        `${' '.repeat(lineNoDigitLen - lineNo.toString().length)}${chalk.grey(
          lineNo + '|',
        )} ${line}`,
      );

      if (targetIdx === idx) {
        errors.push(
          `  ${' '.repeat(lineNoDigitLen + err.column - 1)}${chalk.red('^')}`,
        );
      }
    });

  exitWithErrors(errors);
}
