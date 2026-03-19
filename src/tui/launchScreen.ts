import type { ReactElement } from 'react';
import { render } from 'ink';

export interface LaunchTuiScreenOptions {
  /** Print this message and exit when stdout is not a TTY. Omit to skip the check (caller handles it). */
  ttyErrorMessage?: string;
  /** When true, skip `console.clear()` after exiting the alternate screen buffer. */
  skipClear?: boolean;
}

/**
 * Wraps the standard TUI screen lifecycle used by all `mc` commands:
 *   1. Optional TTY guard (if `ttyErrorMessage` is provided)
 *   2. Enter alternate screen buffer
 *   3. Register SIGTERM handler to restore the screen on signal
 *   4. Render the given Ink element and await exit
 *   5. Restore the screen (idempotent) and optionally clear the console
 */
export async function launchTuiScreen(
  element: ReactElement,
  options?: LaunchTuiScreenOptions,
): Promise<void> {
  if (options?.ttyErrorMessage && !process.stdout.isTTY) {
    console.error(options.ttyErrorMessage);
    process.exit(1);
  }

  process.stdout.write('\x1b[?1049h');

  let restored = false;
  const restoreScreen = (): void => {
    if (restored) return;
    restored = true;
    process.stdout.write('\x1b[?1049l');
    process.stdout.write('\x1b[?25h');
  };

  process.once('SIGTERM', () => {
    restoreScreen();
    process.exit(0);
  });

  try {
    const { waitUntilExit } = render(element, { exitOnCtrlC: true });
    await waitUntilExit();
  } finally {
    restoreScreen();
    if (!options?.skipClear) console.clear();
  }
}
