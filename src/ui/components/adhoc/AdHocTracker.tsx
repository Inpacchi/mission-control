import { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { AlertCircle, ChevronDown, GitBranch, GitCommit } from 'lucide-react';
import { useButtonPress } from '../../hooks/useButtonPress';
import { formatCommitDate } from '../../utils/formatters';
import type { UntrackedCommit } from '@shared/types';
import { useDashboardStore } from '../../stores/dashboardStore';

interface AdHocTrackerProps {
  defaultCollapsed?: boolean;
}

export function AdHocTracker({ defaultCollapsed = true }: AdHocTrackerProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [commits, setCommits] = useState<UntrackedCommit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const { addSession, toggleTerminal } = useDashboardStore();
  const pressHandlers = useButtonPress();

  const fetchUntracked = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sdlc/untracked');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCommits(data.commits ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load untracked commits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collapsed && commits.length === 0) {
      fetchUntracked();
    }
  }, [collapsed, commits.length, fetchUntracked]);

  const handleReconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: '/sdlc-reconciliation',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.session) {
        addSession(data.session);
        toggleTerminal(false); // Expand terminal
      }
    } catch {
      // Session creation failed -- user can see in terminal
    } finally {
      setReconciling(false);
    }
  }, []);

  return (
    <Box
      bg="bg.surface"
      borderRadius="lg"
      border="1px solid"
      borderColor="border.subtle"
      overflow="hidden"
    >
      {/* Header */}
      <Flex
        as="button"
        onClick={() => setCollapsed(!collapsed)}
        align="center"
        gap="2"
        w="100%"
        p="3 4"
        border="none"
        bg="transparent"
        cursor="pointer"
        color="text.primary"
        transition="background-color 100ms ease"
        _hover={{ bg: 'bg.elevated' }}
      >
        <GitBranch size={16} color="#A78BFA" />
        <Text
          fontSize="md"
          fontWeight={600}
          letterSpacing="-0.01em"
          flex={1}
          textAlign="left"
        >
          Ad Hoc Commits
        </Text>
        {commits.length > 0 && (
          <Flex
            as="span"
            align="center"
            justify="center"
            minW="20px"
            h="20px"
            px="6px"
            bg="#A78BFA26"
            color="column.idea"
            borderRadius="full"
            fontSize="xs"
            fontWeight={700}
          >
            {commits.length}
          </Flex>
        )}
        <ChevronDown
          size={14}
          color="#4E5C72"
          style={{
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        />
      </Flex>

      {/* Collapsible body */}
      <Box
        display="grid"
        gridTemplateRows={collapsed ? '0fr' : '1fr'}
        transition={collapsed
          ? 'grid-template-rows 200ms cubic-bezier(0.4, 0, 1, 1)'
          : 'grid-template-rows 250ms cubic-bezier(0, 0, 0.2, 1)'}
      >
        <Box overflow="hidden">
          <Box
            borderTop="1px solid"
            borderColor="border.subtle"
            p="3 4"
          >
            {loading && (
              <Text
                textAlign="center"
                p="4"
                color="text.muted"
                fontSize="sm"
              >
                Loading...
              </Text>
            )}

            {error && (
              <Flex
                align="center"
                gap="2"
                p="2 3"
                bg="semantic.error.bg"
                borderRadius="md"
                color="semantic.error"
                fontSize="sm"
              >
                <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
                {error}
              </Flex>
            )}

            {!loading && !error && commits.length === 0 && (
              <Text
                textAlign="center"
                p="4"
                color="text.muted"
                fontSize="sm"
              >
                No untracked ad hoc commits
              </Text>
            )}

            {!loading && !error && commits.length > 0 && (
              <>
                <Flex direction="column" gap="1" mb="3">
                  {commits.map((commit) => (
                    <Flex
                      key={commit.hash}
                      align="center"
                      gap="2"
                      p="6px 10px"
                      borderRadius="sm"
                      transition="background-color 100ms ease"
                      _hover={{ bg: 'bg.elevated' }}
                    >
                      <GitCommit size={12} color="#4E5C72" style={{ flexShrink: 0 }} />
                      <Text
                        as="span"
                        fontFamily="mono"
                        fontSize="xs"
                        color="text.accent"
                        flexShrink={0}
                      >
                        {commit.hash.slice(0, 7)}
                      </Text>
                      <Text
                        as="span"
                        fontSize="0.8125rem"
                        color="text.primary"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        flex={1}
                        minW={0}
                      >
                        {commit.message}
                      </Text>
                      <Text
                        as="span"
                        fontSize="0.625rem"
                        color="text.muted"
                        fontFamily="mono"
                        whiteSpace="nowrap"
                        flexShrink={0}
                      >
                        {formatCommitDate(commit.date)}
                      </Text>
                    </Flex>
                  ))}
                </Flex>

                {/* Reconcile button */}
                <chakra.button
                  onClick={reconciling ? undefined : handleReconcile}
                  aria-disabled={reconciling}
                  aria-label="Reconcile untracked commits"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  gap="6px"
                  w="100%"
                  px="4"
                  py="2"
                  bg="bg.elevated"
                  border="1px solid"
                  borderColor="border.default"
                  borderRadius="md"
                  color="text.secondary"
                  fontSize="sm"
                  fontWeight={500}
                  cursor={reconciling ? 'not-allowed' : 'pointer'}
                  opacity={reconciling ? 0.4 : 1}
                  transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
                  _hover={reconciling ? {} : {
                    bg: 'bg.overlay',
                    borderColor: 'border.strong',
                    color: 'text.primary',
                  }}
                  {...pressHandlers}
                >
                  <GitBranch size={14} />
                  {reconciling ? 'Reconciling...' : 'Reconcile'}
                </chakra.button>
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
