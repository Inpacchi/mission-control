import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { X, FileText, Map, CheckSquare, AlertTriangle, RotateCcw } from 'lucide-react';
import { MarkdownPreview } from './MarkdownPreview';
import type { Deliverable } from '@shared/types';

interface FileViewerProps {
  deliverable: Deliverable | null;
  open: boolean;
  onClose: () => void;
}

type DocTab = 'spec' | 'plan' | 'result';

interface TabDef {
  key: DocTab;
  label: string;
  icon: typeof FileText;
  path: string | undefined;
}

export function FileViewer({ deliverable, open, onClose }: FileViewerProps) {
  const [activeTab, setActiveTab] = useState<DocTab | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fadeState, setFadeState] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const panelRef = useRef<HTMLDivElement>(null);

  // Determine available tabs
  const tabs: TabDef[] = deliverable
    ? [
        { key: 'spec', label: 'Spec', icon: FileText, path: deliverable.specPath },
        { key: 'plan', label: 'Plan', icon: Map, path: deliverable.planPath },
        { key: 'result', label: 'Result', icon: CheckSquare, path: deliverable.resultPath },
      ].filter((t) => t.path) as TabDef[]
    : [];

  // Select default tab when deliverable changes
  useEffect(() => {
    if (!deliverable || tabs.length === 0) {
      setActiveTab(null);
      setContent('');
      return;
    }

    // Default: most advanced stage first (Result > Plan > Spec)
    const priority: DocTab[] = ['result', 'plan', 'spec'];
    const defaultTab = priority.find((p) => tabs.some((t) => t.key === p));
    setActiveTab(defaultTab ?? tabs[0].key);
  }, [deliverable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content when active tab changes
  useEffect(() => {
    if (!activeTab || !deliverable) return;

    const tab = tabs.find((t) => t.key === activeTab);
    if (!tab?.path) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    // tab.path is an absolute filesystem path; the API expects a path relative to docs/
    const docsSegment = '/docs/';
    const docsIdx = tab.path.indexOf(docsSegment);
    const relativePath = docsIdx !== -1
      ? tab.path.slice(docsIdx + docsSegment.length)
      : tab.path;

    fetch(`/api/files/${relativePath}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setContent(data.content ?? '');
          setLoading(false);
          setFadeState('visible');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, deliverable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tab switch with fade animation
  const switchTab = useCallback(
    (tab: DocTab) => {
      if (tab === activeTab) return;
      setFadeState('fading-out');
      setTimeout(() => {
        setActiveTab(tab);
        setFadeState('fading-in');
        setTimeout(() => setFadeState('visible'), 150);
      }, 80);
    },
    [activeTab]
  );

  // Escape key closes panel
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const showTabs = tabs.length > 1;

  return (
    <Box
      ref={panelRef}
      role="complementary"
      aria-label={deliverable ? `${deliverable.name} preview` : 'Preview panel'}
      w={open ? 'clamp(480px, 60%, 720px)' : '0px'}
      minW={open ? 'clamp(480px, 60%, 720px)' : '0px'}
      h="100%"
      overflow="hidden"
      transition={open
        ? 'width 250ms cubic-bezier(0, 0, 0.2, 1), min-width 250ms cubic-bezier(0, 0, 0.2, 1)'
        : 'width 200ms cubic-bezier(0.4, 0, 1, 1), min-width 200ms cubic-bezier(0.4, 0, 1, 1)'}
      position="relative"
    >
      <Flex
        w="clamp(480px, 60%, 720px)"
        h="100%"
        direction="column"
        bg="bg.surface"
        borderLeft="1px solid"
        borderColor="border.default"
        boxShadow={open ? 'panel' : 'none'}
        transform={open ? 'translateX(0)' : 'translateX(100%)'}
        opacity={open ? 1 : 0.6}
        transition={open
          ? 'transform 250ms cubic-bezier(0, 0, 0.2, 1), opacity 250ms cubic-bezier(0, 0, 0.2, 1)'
          : 'transform 200ms cubic-bezier(0.4, 0, 1, 1), opacity 200ms cubic-bezier(0.4, 0, 1, 1)'}
      >
        {/* Header -- 56px (hero treatment, intentionally taller than dashboard header) */}
        <Flex
          align="center"
          h="56px"
          minH="56px"
          px="4"
          borderBottom="1px solid"
          borderColor="border.subtle"
        >
          {deliverable && (
            <>
              <Text
                as="span"
                display="inline-flex"
                alignItems="center"
                p="2px 6px"
                bg="bg.canvas"
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="sm"
                fontFamily="mono"
                fontSize="sm"
                fontWeight={600}
                color="text.accent"
                flexShrink={0}
                mr="2"
              >
                {deliverable.id.toUpperCase()}
              </Text>
              <Text
                as="span"
                fontSize="base"
                fontWeight={500}
                color="text.primary"
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                flex={1}
              >
                {deliverable.name}
              </Text>
            </>
          )}

          <Flex
            as="button"
            onClick={onClose}
            aria-label="Close preview"
            align="center"
            justify="center"
            w="32px"
            h="32px"
            border="none"
            bg="transparent"
            color="text.muted"
            cursor="pointer"
            borderRadius="md"
            flexShrink={0}
            ml="2"
            transition="background-color 100ms ease, color 100ms ease"
            _hover={{ bg: 'bg.overlay', color: 'text.secondary' }}
          >
            <X size={16} />
          </Flex>
        </Flex>

        {/* Tab bar -- 40px, only if multiple docs */}
        {showTabs && (
          <Flex
            align="stretch"
            h="40px"
            minH="40px"
            bg="bg.surface"
            borderBottom="1px solid"
            borderColor="border.subtle"
            position="relative"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Flex
                  key={tab.key}
                  as="button"
                  onClick={() => switchTab(tab.key)}
                  align="center"
                  gap="6px"
                  px="4"
                  h="100%"
                  border="none"
                  borderBottom="2px solid"
                  borderColor={isActive ? 'accent.blue.400' : 'transparent'}
                  bg="transparent"
                  color={isActive ? 'text.primary' : 'text.secondary'}
                  fontSize="sm"
                  fontWeight={500}
                  cursor="pointer"
                  transition="color 150ms ease, background-color 150ms ease, border-color 250ms cubic-bezier(0.4, 0, 0.2, 1)"
                  _hover={isActive ? {} : { bg: 'bg.overlay', color: 'text.primary' }}
                >
                  <Icon size={14} />
                  {tab.label}
                </Flex>
              );
            })}
          </Flex>
        )}

        {/* Body */}
        <Box
          flex={1}
          p="5 6"
          overflowY="auto"
          opacity={fadeState === 'fading-out' ? 0 : 1}
          transition={fadeState === 'fading-out'
            ? 'opacity 80ms ease-in'
            : 'opacity 150ms ease-out'}
        >
          {loading && (
            <Flex
              align="center"
              justify="center"
              h="100px"
              color="text.muted"
              fontSize="sm"
            >
              Loading...
            </Flex>
          )}

          {error && (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap="2"
              p="6"
              textAlign="center"
            >
              <AlertTriangle size={28} color="#F87171" />
              <Text fontSize="base" color="text.primary">
                Failed to load file
              </Text>
              <Text fontSize="sm" color="text.secondary">{error}</Text>
              <Flex
                as="button"
                onClick={() => {
                  setError(null);
                  // Re-trigger fetch by toggling tab off and back on
                  const current = activeTab;
                  setActiveTab(null);
                  setTimeout(() => setActiveTab(current), 0);
                }}
                align="center"
                gap="6px"
                mt="1"
                px="14px"
                py="6px"
                bg="bg.elevated"
                border="1px solid"
                borderColor="border.default"
                borderRadius="md"
                color="text.secondary"
                fontSize="sm"
                fontWeight={500}
                cursor="pointer"
                transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
                _hover={{
                  bg: 'bg.overlay',
                  borderColor: 'border.strong',
                  color: 'text.primary',
                }}
              >
                <RotateCcw size={14} />
                Retry
              </Flex>
            </Flex>
          )}

          {!loading && !error && content && (
            <Box maxW="600px">
              <MarkdownPreview content={content} />
            </Box>
          )}

          {!loading && !error && !content && deliverable && tabs.length === 0 && (
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap="2"
              p="6"
              textAlign="center"
              color="text.muted"
            >
              <FileText size={28} />
              <Text fontSize="base" color="text.secondary">
                No documents yet
              </Text>
              <Text fontSize="sm">
                Create a spec or plan to see it here
              </Text>
            </Flex>
          )}
        </Box>
      </Flex>
    </Box>
  );
}
