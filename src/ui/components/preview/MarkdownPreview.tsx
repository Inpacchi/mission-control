import { useEffect, useRef, useMemo } from 'react';
import 'highlight.js/styles/github-dark.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

interface MarkdownPreviewProps {
  content: string;
}

/**
 * Renders a Mermaid diagram block.
 * Uses dynamic import so mermaid is code-split and only loaded when needed.
 */
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#0D1117',
          primaryColor: '#2F74D0',
          primaryTextColor: '#E8EDF4',
          primaryBorderColor: '#2A3750',
          lineColor: '#4E5C72',
          secondaryColor: '#1C2333',
          tertiaryColor: '#232D3F',
        },
      });

      if (cancelled || !containerRef.current) return;

      try {
        const { svg } = await mermaid.render(idRef.current, code);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.textContent = 'Failed to render diagram';
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: '#0D1117',
        border: '1px solid #1E2A3B',
        borderRadius: '8px',
        margin: '12px 0',
        overflow: 'auto',
      }}
    />
  );
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const components: Components = useMemo(
    () => ({
      code({ className, children, ...props }) {
        const match = /language-(\w+)/.exec(className || '');
        const codeString = String(children).replace(/\n$/, '');

        // Mermaid diagram support
        if (match && match[1] === 'mermaid') {
          return <MermaidBlock code={codeString} />;
        }

        // Inline code
        if (!match) {
          return (
            <code
              style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                fontSize: '0.8125rem',
                backgroundColor: '#0D1117',
                border: '1px solid #1E2A3B',
                borderRadius: '4px',
                padding: '2px 6px',
                color: '#E8EDF4',
              }}
              {...props}
            >
              {children}
            </code>
          );
        }

        // Block code with syntax highlighting
        return (
          <code
            className={className}
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: '0.8125rem',
              lineHeight: 1.6,
            }}
            {...props}
          >
            {children}
          </code>
        );
      },

      pre({ children }) {
        return (
          <pre
            style={{
              backgroundColor: '#0D1117',
              border: '1px solid #1E2A3B',
              borderRadius: '8px',
              padding: '16px',
              margin: '12px 0',
              overflowX: 'auto',
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              fontSize: '0.8125rem',
              lineHeight: 1.6,
            }}
          >
            {children}
          </pre>
        );
      },

      h1({ children }) {
        return (
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#E8EDF4',
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
              marginTop: '24px',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: '1px solid #1E2A3B',
            }}
          >
            {children}
          </h1>
        );
      },

      h2({ children }) {
        return (
          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: '#E8EDF4',
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              marginTop: '20px',
              marginBottom: '8px',
              paddingBottom: '6px',
              borderBottom: '1px solid #1E2A3B',
            }}
          >
            {children}
          </h2>
        );
      },

      h3({ children }) {
        return (
          <h3
            style={{
              fontSize: '1.0625rem',
              fontWeight: 600,
              color: '#E8EDF4',
              lineHeight: 1.4,
              letterSpacing: '-0.01em',
              marginTop: '16px',
              marginBottom: '8px',
            }}
          >
            {children}
          </h3>
        );
      },

      p({ children }) {
        return (
          <p
            style={{
              fontSize: '0.875rem',
              fontWeight: 400,
              color: '#E8EDF4',
              lineHeight: 1.6,
              margin: '8px 0',
            }}
          >
            {children}
          </p>
        );
      },

      a({ href, children }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#7EB8F7',
              textDecoration: 'none',
              borderBottom: '1px solid transparent',
              transition: 'border-color 150ms ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderBottomColor = '#7EB8F7';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent';
            }}
          >
            {children}
          </a>
        );
      },

      ul({ children }) {
        return (
          <ul
            style={{
              paddingLeft: '20px',
              margin: '8px 0',
              fontSize: '0.875rem',
              color: '#E8EDF4',
              lineHeight: 1.6,
            }}
          >
            {children}
          </ul>
        );
      },

      ol({ children }) {
        return (
          <ol
            style={{
              paddingLeft: '20px',
              margin: '8px 0',
              fontSize: '0.875rem',
              color: '#E8EDF4',
              lineHeight: 1.6,
            }}
          >
            {children}
          </ol>
        );
      },

      li({ children }) {
        return (
          <li
            style={{
              marginBottom: '4px',
              color: '#E8EDF4',
            }}
          >
            {children}
          </li>
        );
      },

      blockquote({ children }) {
        return (
          <blockquote
            style={{
              borderLeft: '3px solid #2F74D0',
              paddingLeft: '16px',
              margin: '12px 0',
              color: '#8B99B3',
              fontStyle: 'italic',
            }}
          >
            {children}
          </blockquote>
        );
      },

      table({ children }) {
        return (
          <div style={{ overflowX: 'auto', margin: '12px 0' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.8125rem',
              }}
            >
              {children}
            </table>
          </div>
        );
      },

      th({ children }) {
        return (
          <th
            style={{
              textAlign: 'left',
              padding: '8px 12px',
              borderBottom: '2px solid #2A3750',
              color: '#E8EDF4',
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {children}
          </th>
        );
      },

      td({ children }) {
        return (
          <td
            style={{
              padding: '6px 12px',
              borderBottom: '1px solid #1E2A3B',
              color: '#E8EDF4',
            }}
          >
            {children}
          </td>
        );
      },

      hr() {
        return (
          <hr
            style={{
              border: 'none',
              borderTop: '1px solid #1E2A3B',
              margin: '16px 0',
            }}
          />
        );
      },

      strong({ children }) {
        return <strong style={{ fontWeight: 600, color: '#E8EDF4' }}>{children}</strong>;
      },

      em({ children }) {
        return <em style={{ color: '#8B99B3' }}>{children}</em>;
      },
    }),
    []
  );

  return (
    <div
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        color: '#E8EDF4',
        lineHeight: 1.6,
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
