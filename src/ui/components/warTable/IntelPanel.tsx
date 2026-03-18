import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { FileText, Map, CheckSquare, AlertTriangle, RotateCcw } from 'lucide-react';
import { MarkdownPreview } from '../preview/MarkdownPreview';
import { ChronicleBrowser } from '../chronicle/ChronicleBrowser';
import { AdHocTracker } from '../adhoc/AdHocTracker';
import { SessionHistory } from '../terminal/SessionHistory';
import { useDashboardStore } from '../../stores/dashboardStore';
import { STATUS_ACCENT } from '../../utils/rarity';
import type { Deliverable } from '@shared/types';

type DocTab = 'spec' | 'plan' | 'result';

interface TabDef {
  key: DocTab;
  label: string;
  icon: typeof FileText;
  path: string | undefined;
}

interface IntelPanelProps {
  deliverables: Deliverable[];
}

export function IntelPanel({
  deliverables,
}: IntelPanelProps) {
  const {
    intelCardId,
    openSupplementaryPanel,
    toggleSupplementaryPanel,
  } = useDashboardStore();

  const selectedDeliverable = useMemo(
    () => deliverables.find((d) => d.id === intelCardId) ?? null,
    [deliverables, intelCardId]
  );

  const tabs: TabDef[] = useMemo(
    () =>
      selectedDeliverable
        ? ([
            { key: 'spec', label: 'Spec', icon: FileText, path: selectedDeliverable.specPath },
            { key: 'plan', label: 'Plan', icon: Map, path: selectedDeliverable.planPath },
            { key: 'result', label: 'Result', icon: CheckSquare, path: selectedDeliverable.resultPath },
          ] as TabDef[]).filter((t) => t.path)
        : [],
    [selectedDeliverable]
  );

  const [activeTab, setActiveTab] = useState<DocTab | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Select default tab when selection changes
  useEffect(() => {
    if (!selectedDeliverable || tabs.length === 0) {
      setActiveTab(null);
      setContent('');
      return;
    }
    const priority: DocTab[] = ['result', 'plan', 'spec'];
    const defaultTab = priority.find((p) => tabs.some((t) => t.key === p));
    setActiveTab(defaultTab ?? tabs[0].key);
  }, [selectedDeliverable?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch content on tab change or retry
  useEffect(() => {
    if (!activeTab || !selectedDeliverable) return;

    const tab = tabs.find((t) => t.key === activeTab);
    if (!tab?.path) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    const docsSegment = '/docs/';
    const docsIdx = tab.path.indexOf(docsSegment);
    const relativePath =
      docsIdx !== -1 ? tab.path.slice(docsIdx + docsSegment.length) : tab.path;

    fetch(`/api/files/${relativePath}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setContent(data.content ?? '');
          setLoading(false);
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
  }, [activeTab, selectedDeliverable?.id, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = useCallback(
    (tab: DocTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
    },
    [activeTab]
  );

  const retryLoad = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const statusColor = selectedDeliverable
    ? (STATUS_ACCENT[selectedDeliverable.status as keyof typeof STATUS_ACCENT] ?? '#8B99B3')
    : '#8B99B3';

  return (
    <Flex
      direction="column"
      h="100%"
      overflow="hidden"
      bg="bg.surface"
      borderLeft="1px solid"
      borderColor="border.subtle"
    >
      {/* === Card selected: header + tabs + content === */}
      {selectedDeliverable ? (
        <>
          {/* Compact deliverable header */}
          <Flex
            align="center"
            gap="2"
            px="3"
            py="10px"
            borderBottom="1px solid"
            borderColor="border.subtle"
            flexShrink={0}
          >
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              px="6px"
              py="2px"
              bg="bg.canvas"
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="sm"
              fontFamily="mono"
              fontSize="xs"
              fontWeight={700}
              color="text.accent"
              flexShrink={0}
            >
              {selectedDeliverable.id.toUpperCase()}
            </Text>

            <Text
              as="span"
              fontSize="sm"
              fontWeight={500}
              color="text.primary"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
              flex={1}
              minW={0}
            >
              {selectedDeliverable.name}
            </Text>

            {/* Status badge */}
            <Text
              as="span"
              px="6px"
              py="2px"
              borderRadius="sm"
              fontSize="xs"
              fontWeight={600}
              color={statusColor}
              bg="rgba(0,0,0,0.3)"
              border="1px solid"
              borderColor={`${statusColor}40`}
              flexShrink={0}
              textTransform="capitalize"
            >
              {selectedDeliverable.status}
            </Text>

            {/* Type/rarity indicator */}
            {selectedDeliverable.cardType && (
              <Text
                as="span"
                px="5px"
                py="1px"
                borderRadius="sm"
                fontSize="xs"
                fontWeight={500}
                color="text.muted"
                bg="bg.elevated"
                flexShrink={0}
                textTransform="capitalize"
              >
                {selectedDeliverable.cardType}
              </Text>
            )}
          </Flex>

          {/* Tab bar — only show if there are tabs */}
          {tabs.length > 0 && (
            <Flex
              align="stretch"
              h="36px"
              minH="36px"
              borderBottom="1px solid"
              borderColor="border.subtle"
              flexShrink={0}
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
                    gap="5px"
                    px="3"
                    h="100%"
                    border="none"
                    borderBottom="2px solid"
                    borderColor={isActive ? 'accent.blue.400' : 'transparent'}
                    bg="transparent"
                    color={isActive ? 'text.primary' : 'text.secondary'}
                    fontSize="xs"
                    fontWeight={500}
                    cursor="pointer"
                    transition="color 150ms ease, border-color 200ms ease"
                    _hover={isActive ? {} : { color: 'text.primary' }}
                    _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </Flex>
                );
              })}
            </Flex>
          )}

          {/* Markdown content body */}
          <Box
            flex={1}
            overflowY="auto"
            p="4"
          >
            {loading && (
              <Flex
                align="center"
                justify="center"
                h="80px"
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
                p="4"
                textAlign="center"
              >
                <AlertTriangle size={24} color="#F87171" />
                <Text fontSize="sm" color="text.primary">
                  Failed to load file
                </Text>
                <Text fontSize="xs" color="text.secondary">{error}</Text>
                <Flex
                  as="button"
                  onClick={retryLoad}
                  align="center"
                  gap="5px"
                  mt="1"
                  px="12px"
                  py="5px"
                  bg="bg.elevated"
                  border="1px solid"
                  borderColor="border.default"
                  borderRadius="md"
                  color="text.secondary"
                  fontSize="xs"
                  fontWeight={500}
                  cursor="pointer"
                  transition="background-color 150ms ease, color 150ms ease"
                  _hover={{ bg: 'bg.overlay', color: 'text.primary' }}
                  _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
                >
                  <RotateCcw size={12} />
                  Retry
                </Flex>
              </Flex>
            )}

            {!loading && !error && content && (
              <MarkdownPreview content={content} />
            )}

            {!loading && !error && !content && tabs.length === 0 && (
              <Flex
                direction="column"
                align="center"
                justify="center"
                gap="2"
                p="4"
                textAlign="center"
                color="text.muted"
              >
                <FileText size={24} />
                <Text fontSize="sm" color="text.secondary">
                  No documents yet
                </Text>
                <Text fontSize="xs">
                  Create a spec or plan to see it here
                </Text>
              </Flex>
            )}
          </Box>
        </>
      ) : (
        /* === No card selected: empty state === */
        <Flex
          flex={1}
          direction="column"
          align="center"
          justify="center"
          gap="3"
          p="5"
          textAlign="center"
        >
          <Box
            w="40px"
            h="40px"
            borderRadius="md"
            border="1px dashed"
            borderColor="border.default"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={0.4}
          >
            <FileText size={20} color="#4E5C72" />
          </Box>
          <Text fontSize="sm" color="text.muted" lineHeight={1.5}>
            Select a card from the tactical field
            <br />
            to view its documents
          </Text>
        </Flex>
      )}

      {/* === Supplementary panels accordion === */}
      <Flex
        direction="column"
        px="2"
        pb="2"
        gap="1"
        flexShrink={0}
        borderTop="1px solid"
        borderColor="border.subtle"
        pt="2"
      >
        <ChronicleBrowser
          isOpen={openSupplementaryPanel === 'chronicle'}
          onToggle={() => toggleSupplementaryPanel('chronicle')}
        />
        <AdHocTracker
          isOpen={openSupplementaryPanel === 'adhoc'}
          onToggle={() => toggleSupplementaryPanel('adhoc')}
        />
        <SessionHistory
          isOpen={openSupplementaryPanel === 'sessions'}
          onToggle={() => toggleSupplementaryPanel('sessions')}
        />
      </Flex>
    </Flex>
  );
}
