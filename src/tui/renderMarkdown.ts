import chalk from 'chalk';
import { Marked, type Token, type Tokens, type RendererObject } from 'marked';

// Strip ANSI escape sequences for accurate visible-width measurement
export function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

// Recursively render an inline token array to ANSI-styled text.
function renderInline(tokens: Token[]): string {
  return tokens
    .map((t) => {
      switch (t.type) {
        case 'text': {
          const textToken = t as Tokens.Text & { tokens?: Token[] };
          // Text tokens can contain nested inline tokens (bold, italic, etc.)
          if (textToken.tokens && textToken.tokens.length > 0) {
            return renderInline(textToken.tokens);
          }
          return textToken.text;
        }
        case 'strong':
          return chalk.bold(renderInline((t as Tokens.Strong).tokens ?? []));
        case 'em':
          return chalk.italic(renderInline((t as Tokens.Em).tokens ?? []));
        case 'codespan':
          return chalk.bgGray.white(` ${(t as Tokens.Codespan).text} `);
        case 'link': {
          const link = t as Tokens.Link;
          const text = renderInline(link.tokens ?? []);
          return text === link.href
            ? chalk.cyan.underline(link.href)
            : `${text} ${chalk.dim('(')}${chalk.cyan.underline(link.href)}${chalk.dim(')')}`;
        }
        case 'del':
          return chalk.strikethrough(renderInline((t as Tokens.Del).tokens ?? []));
        case 'br':
          return '\n';
        case 'escape':
          return (t as Tokens.Escape).text;
        default:
          // Fallback: prefer nested tokens, then raw text
          if ('tokens' in t && Array.isArray((t as { tokens: unknown }).tokens)) {
            return renderInline((t as { tokens: Token[] }).tokens);
          }
          if ('text' in t && typeof (t as { text: unknown }).text === 'string') {
            return (t as { text: string }).text;
          }
          return '';
      }
    })
    .join('');
}

// Get plain text from tokens (no ANSI styling) for width measurement
function plainText(tokens: Token[]): string {
  return tokens
    .map((t) => {
      const any = t as { tokens?: Token[]; text?: string };
      if (any.tokens && any.tokens.length > 0) return plainText(any.tokens);
      if (typeof any.text === 'string') return any.text;
      return '';
    })
    .join('');
}

function buildAnsiRenderer(): RendererObject {
  return {
    heading({ tokens, depth }: Tokens.Heading): string {
      const text = renderInline(tokens);
      switch (depth) {
        case 1:
          return (
            '\n' +
            chalk.bold.cyan(text) +
            '\n' +
            chalk.cyan('━'.repeat(Math.min(text.length + 4, 60))) +
            '\n'
          );
        case 2:
          return (
            '\n' +
            chalk.bold.yellow(text) +
            '\n' +
            chalk.yellow('─'.repeat(Math.min(text.length + 2, 50))) +
            '\n'
          );
        case 3:
          return '\n' + chalk.bold.white(text) + '\n';
        default:
          return '\n' + chalk.dim.underline(text) + '\n';
      }
    },

    paragraph({ tokens }: Tokens.Paragraph): string {
      return '\n' + renderInline(tokens) + '\n';
    },

    code({ text, lang }: Tokens.Code): string {
      const header = lang ? chalk.dim.italic(`  ${lang}`) + '\n' : '';
      const border = chalk.dim('  │ ');
      const lines = text.split('\n').map((l) => border + chalk.white(l));
      return '\n' + header + lines.join('\n') + '\n';
    },

    codespan({ text }: Tokens.Codespan): string {
      return chalk.bgGray.white(` ${text} `);
    },

    strong({ tokens }: Tokens.Strong): string {
      return chalk.bold(renderInline(tokens ?? []));
    },

    em({ tokens }: Tokens.Em): string {
      return chalk.italic(renderInline(tokens ?? []));
    },

    blockquote({ tokens }: Tokens.Blockquote): string {
      // tokens here are block-level (paragraph etc.); we need to flatten them.
      // Walk the token list: for each paragraph-like token recurse into its children,
      // otherwise fall back to extracting .text.
      const inner = (tokens as Token[])
        .map((t) => {
          if ('tokens' in t && Array.isArray((t as { tokens: unknown }).tokens)) {
            return renderInline((t as { tokens: Token[] }).tokens);
          }
          if ('text' in t && typeof (t as { text: unknown }).text === 'string') {
            return (t as { text: string }).text;
          }
          return '';
        })
        .join('\n');
      const lines = inner.split('\n').map((l) => chalk.green('  ▎ ') + chalk.dim(l));
      return '\n' + lines.join('\n') + '\n';
    },

    list(token: Tokens.List): string {
      const lines = token.items.map((item: Tokens.ListItem, i: number) => {
        // List item tokens are block-level (paragraphs, etc.) — render their inline children
        const text = (item.tokens ?? [])
          .map((t) => {
            const any = t as { tokens?: Token[]; text?: string };
            if (any.tokens && any.tokens.length > 0) return renderInline(any.tokens);
            if (typeof any.text === 'string') return any.text;
            return '';
          })
          .join(' ')
          .trim();
        const bullet = token.ordered ? chalk.cyan(`  ${i + 1}.`) : chalk.cyan('  •');
        const checked =
          item.checked === true
            ? chalk.green(' ✓')
            : item.checked === false
              ? chalk.red(' ✗')
              : '';
        return `${bullet}${checked} ${text}`;
      });
      return '\n' + lines.join('\n') + '\n';
    },

    hr(_token: Tokens.Hr): string {
      return '\n' + chalk.dim('  ' + '─'.repeat(48)) + '\n';
    },

    link({ href, tokens }: Tokens.Link): string {
      const text = renderInline(tokens ?? []);
      if (text === href) return chalk.cyan.underline(href);
      return `${text} ${chalk.dim('(')}${chalk.cyan.underline(href)}${chalk.dim(')')}`;
    },

    table(token: Tokens.Table): string {
      // Render styled and plain versions of each cell
      const headers = token.header.map((cell) => renderInline(cell.tokens));
      const headersPlain = token.header.map((cell) => plainText(cell.tokens));
      const rows = token.rows.map((row) => row.map((cell) => renderInline(cell.tokens)));
      const rowsPlain = token.rows.map((row) => row.map((cell) => plainText(cell.tokens)));

      // Compute column widths from plain text (no ANSI codes)
      const colWidths = headersPlain.map((h, i) => {
        const maxRow = rowsPlain.reduce((max, row) => Math.max(max, (row[i] ?? '').length), 0);
        return Math.max(h.length, maxRow, 3);
      });

      // Pad using visible width (strip ANSI before measuring)
      const padStyled = (s: string, w: number) => {
        const visible = stripAnsi(s).length;
        return s + ' '.repeat(Math.max(0, w - visible));
      };

      const headerLine =
        '  ' + headers.map((h, i) => chalk.bold(padStyled(h, colWidths[i]))).join(chalk.dim(' │ '));
      const separator =
        '  ' + colWidths.map((w) => '─'.repeat(w)).join(chalk.dim('─┼─'));
      const bodyLines = rows.map(
        (row) => '  ' + row.map((cell, i) => padStyled(cell, colWidths[i])).join(chalk.dim(' │ '))
      );

      return (
        '\n' +
        headerLine +
        '\n' +
        chalk.dim(separator) +
        '\n' +
        bodyLines.join('\n') +
        '\n'
      );
    },
  };
}

/**
 * Render markdown to ANSI-styled terminal text.
 * Mermaid code blocks are replaced with a readable placeholder since they
 * cannot be rendered in a terminal environment.
 */
export function renderMarkdownToAnsi(content: string): string {
  const processed = content.replace(
    /```mermaid[\s\S]*?```/g,
    '> [Mermaid diagram — view with mc --web]'
  );

  // Create a fresh instance per call to avoid mutating the global marked singleton.
  const instance = new Marked();
  const renderer = buildAnsiRenderer();
  instance.use({ renderer });
  return instance.parse(processed) as string;
}
