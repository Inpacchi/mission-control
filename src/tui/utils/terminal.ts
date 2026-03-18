export function getTerminalWidth(): number {
  return process.stdout.columns || 80;
}

export function getTerminalHeight(): number {
  return process.stdout.rows || 24;
}

export function supportsColor(): boolean {
  return process.env.TERM !== 'dumb' && process.stdout.isTTY === true;
}
