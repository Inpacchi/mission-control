import { useEffect, useRef, useMemo } from 'react';
import { Box, Flex, Text, Heading, Code, Link } from '@chakra-ui/react';
import { chakra } from '@chakra-ui/react';
import 'highlight.js/styles/github-dark.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import type { Components } from 'react-markdown';

interface MarkdownPreviewProps {
  content: string;
}

/**
 * Module-level promise that resolves to the initialised mermaid instance.
 * Dynamic import ensures mermaid is code-split; the promise is created once
 * so initialize() is called exactly once regardless of how many MermaidBlock
 * components mount or re-render.
 */
const mermaidReady: Promise<typeof import('mermaid').default> = import('mermaid').then(
  (mod) => {
    const mermaid = mod.default;
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
    return mermaid;
  }
);

/**
 * Renders a Mermaid diagram block.
 * Uses the module-scoped mermaidReady promise so mermaid is code-split and
 * initialize() is called exactly once.
 */
function MermaidBlock({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2, 9)}`);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = await mermaidReady;

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
    <Flex
      ref={containerRef}
      justify="center"
      p="4"
      bg="bg.canvas"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="md"
      my="3"
      overflow="auto"
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
            <Code
              fontFamily="mono"
              fontSize="0.8125rem"
              bg="bg.canvas"
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="sm"
              px="6px"
              py="2px"
              color="text.primary"
              {...props}
            >
              {children}
            </Code>
          );
        }

        // Block code with syntax highlighting
        return (
          <chakra.code
            className={className}
            fontFamily="mono"
            fontSize="0.8125rem"
            lineHeight={1.6}
            {...props}
          >
            {children}
          </chakra.code>
        );
      },

      pre({ children }) {
        return (
          <chakra.pre
            bg="bg.canvas"
            border="1px solid"
            borderColor="border.subtle"
            borderRadius="md"
            p="4"
            my="3"
            overflowX="auto"
            fontFamily="mono"
            fontSize="0.8125rem"
            lineHeight={1.6}
          >
            {children}
          </chakra.pre>
        );
      },

      h1({ children }) {
        return (
          <Heading
            as="h1"
            fontSize="2xl"
            fontWeight={700}
            color="text.primary"
            lineHeight={1.2}
            letterSpacing="-0.03em"
            mt="6"
            mb="3"
            pb="2"
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            {children}
          </Heading>
        );
      },

      h2({ children }) {
        return (
          <Heading
            as="h2"
            fontSize="xl"
            fontWeight={600}
            color="text.primary"
            lineHeight={1.3}
            letterSpacing="-0.02em"
            mt="5"
            mb="2"
            pb="6px"
            borderBottom="1px solid"
            borderColor="border.subtle"
          >
            {children}
          </Heading>
        );
      },

      h3({ children }) {
        return (
          <Heading
            as="h3"
            fontSize="lg"
            fontWeight={600}
            color="text.primary"
            lineHeight={1.4}
            letterSpacing="-0.01em"
            mt="4"
            mb="2"
          >
            {children}
          </Heading>
        );
      },

      p({ children }) {
        return (
          <Text
            fontSize="base"
            fontWeight={400}
            color="text.primary"
            lineHeight={1.6}
            my="2"
          >
            {children}
          </Text>
        );
      },

      a({ href, children }) {
        return (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            color="text.accent"
            textDecoration="none"
            borderBottom="1px solid transparent"
            transition="border-color 150ms ease"
            _hover={{ borderBottomColor: 'text.accent' }}
          >
            {children}
          </Link>
        );
      },

      ul({ children }) {
        return (
          <chakra.ul
            pl="5"
            my="2"
            fontSize="base"
            color="text.primary"
            lineHeight={1.6}
          >
            {children}
          </chakra.ul>
        );
      },

      ol({ children }) {
        return (
          <chakra.ol
            pl="5"
            my="2"
            fontSize="base"
            color="text.primary"
            lineHeight={1.6}
          >
            {children}
          </chakra.ol>
        );
      },

      li({ children }) {
        return (
          <chakra.li
            mb="1"
            color="text.primary"
          >
            {children}
          </chakra.li>
        );
      },

      blockquote({ children }) {
        return (
          <chakra.blockquote
            borderLeft="3px solid"
            borderColor="accent.blue.500"
            pl="4"
            my="3"
            color="text.secondary"
            fontStyle="italic"
          >
            {children}
          </chakra.blockquote>
        );
      },

      table({ children }) {
        return (
          <Box overflowX="auto" my="3">
            <chakra.table
              w="100%"
              css={{ borderCollapse: 'collapse' }}
              fontSize="0.8125rem"
            >
              {children}
            </chakra.table>
          </Box>
        );
      },

      th({ children }) {
        return (
          <chakra.th
            textAlign="left"
            p="2 3"
            borderBottom="2px solid"
            borderColor="border.default"
            color="text.primary"
            fontWeight={600}
            fontSize="sm"
            textTransform="uppercase"
            letterSpacing="0.03em"
          >
            {children}
          </chakra.th>
        );
      },

      td({ children }) {
        return (
          <chakra.td
            p="6px 12px"
            borderBottom="1px solid"
            borderColor="border.subtle"
            color="text.primary"
          >
            {children}
          </chakra.td>
        );
      },

      hr() {
        return (
          <Box
            as="hr"
            border="none"
            borderTop="1px solid"
            borderColor="border.subtle"
            my="4"
          />
        );
      },

      strong({ children }) {
        return (
          <Text as="strong" fontWeight={600} color="text.primary">
            {children}
          </Text>
        );
      },

      em({ children }) {
        return (
          <Text as="em" color="text.secondary">
            {children}
          </Text>
        );
      },
    }),
    []
  );

  return (
    <Box
      fontFamily="body"
      color="text.primary"
      lineHeight={1.6}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );
}
