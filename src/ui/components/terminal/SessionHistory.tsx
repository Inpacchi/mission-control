import { useCallback, useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { History, Search, ChevronDown, Terminal, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useSessionHistory } from '../../hooks/useSessionHistory';
import { formatDate } from '../../utils/formatters';

interface SessionHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SessionHistory({ isOpen, onToggle }: SessionHistoryProps) {
  const {
    sessions,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    dateFilter,
    setDateFilter,
    fetchLog,
  } = useSessionHistory();

  const [viewingLog, setViewingLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string>('');
  const [logLoading, setLogLoading] = useState(false);

  const handleViewLog = useCallback(
    async (sessionId: string) => {
      if (viewingLog === sessionId) {
        setViewingLog(null);
        setLogContent('');
        return;
      }

      setViewingLog(sessionId);
      setLogLoading(true);
      try {
        const content = await fetchLog(sessionId);
        setLogContent(content);
      } catch {
        setLogContent('Failed to load log content');
      } finally {
        setLogLoading(false);
      }
    },
    [viewingLog, fetchLog]
  );

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
        onClick={onToggle}
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
        <History size={16} color="#60A5FA" />
        <Text
          fontSize="md"
          fontWeight={600}
          letterSpacing="-0.01em"
          flex={1}
          textAlign="left"
        >
          Session History
        </Text>
        <Text
          fontSize="xs"
          color="text.muted"
          fontWeight={500}
        >
          {sessions.length} sessions
        </Text>
        <ChevronDown
          size={14}
          color="#4E5C72"
          style={{
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </Flex>

      {/* Collapsible body */}
      <Box
        display="grid"
        gridTemplateRows={isOpen ? '1fr' : '0fr'}
        transition={isOpen
          ? 'grid-template-rows 280ms cubic-bezier(0, 0, 0.2, 1)'
          : 'grid-template-rows 200ms cubic-bezier(0.4, 0, 1, 1)'}
      >
        <Box overflow="hidden">
          <Box
            borderTop="1px solid"
            borderColor="border.subtle"
            p="3 4"
            maxH="280px"
            overflowY="auto"
          >
            {/* Search + Date filter */}
            <Flex gap="2" mb="3">
              <Flex
                align="center"
                gap="2"
                px="3"
                py="6px"
                bg="bg.input"
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="md"
                flex={1}
              >
                <Search size={14} color="#4E5C72" />
                <chakra.input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  flex={1}
                  border="none"
                  bg="transparent"
                  color="text.primary"
                  fontSize="sm"
                  outline="none"
                  fontFamily="body"
                />
              </Flex>
              <chakra.input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                px="10px"
                py="6px"
                bg="bg.input"
                border="1px solid"
                borderColor="border.subtle"
                borderRadius="md"
                color="text.secondary"
                fontSize="sm"
                outline="none"
                fontFamily="mono"
                colorScheme="dark"
              />
            </Flex>

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
              <Box
                p="2 3"
                bg="semantic.error.bg"
                borderRadius="md"
                color="semantic.error"
                fontSize="sm"
              >
                {error}
              </Box>
            )}

            {!loading && !error && sessions.length === 0 && (
              <Flex
                direction="column"
                align="center"
                gap="2"
                p="6"
                textAlign="center"
              >
                <History size={32} color="#4E5C72" />
                <Text fontSize="base" color="text.secondary">
                  No session history yet
                </Text>
                <Text fontSize="sm" color="text.muted">
                  Sessions are saved automatically when closed
                </Text>
              </Flex>
            )}

            {!loading && !error && sessions.length > 0 && (
              <Flex
                direction="column"
                gap="1"
              >
                {sessions.map((session) => {
                  const isViewing = viewingLog === session.id;
                  const exitOk = session.exitCode === 0;

                  return (
                    <Box key={session.id}>
                      <Flex
                        onClick={() => handleViewLog(session.id)}
                        align="center"
                        gap="2"
                        p="2 10px"
                        borderRadius="sm"
                        cursor="pointer"
                        bg={isViewing ? 'bg.elevated' : 'transparent'}
                        transition="background-color 100ms ease"
                        _hover={{ bg: 'bg.elevated' }}
                      >
                        {/* Exit code indicator */}
                        {session.exitCode !== undefined ? (
                          exitOk ? (
                            <CheckCircle size={12} color="#22C55E" style={{ flexShrink: 0 }} />
                          ) : (
                            <XCircle size={12} color="#F87171" style={{ flexShrink: 0 }} />
                          )
                        ) : (
                          <Terminal size={12} color="#4E5C72" style={{ flexShrink: 0 }} />
                        )}

                        {/* Command */}
                        <Text
                          as="span"
                          fontSize="0.8125rem"
                          color="text.primary"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          flex={1}
                          minW={0}
                          fontFamily="mono"
                        >
                          {session.command || 'claude'}
                        </Text>

                        {/* Date */}
                        <Text
                          as="span"
                          fontSize="0.625rem"
                          color="text.muted"
                          fontFamily="mono"
                          whiteSpace="nowrap"
                          flexShrink={0}
                        >
                          {formatDate(session.startedAt)}
                        </Text>

                        {/* Log size */}
                        {session.logSize !== undefined && session.logSize > 0 && (
                          <Text
                            as="span"
                            display="inline-flex"
                            alignItems="center"
                            gap="3px"
                            fontSize="0.625rem"
                            color="text.muted"
                            flexShrink={0}
                          >
                            <FileText size={10} />
                            {formatBytes(session.logSize)}
                          </Text>
                        )}
                      </Flex>

                      {/* Log viewer */}
                      {isViewing && (
                        <Box
                          m="1 0 1 24px"
                          p="3"
                          bg="bg.canvas"
                          border="1px solid"
                          borderColor="border.subtle"
                          borderRadius="md"
                          maxH="200px"
                          overflowY="auto"
                        >
                          {logLoading ? (
                            <Text color="text.muted" fontSize="sm">
                              Loading log...
                            </Text>
                          ) : (
                            <chakra.pre
                              fontFamily="mono"
                              fontSize="xs"
                              lineHeight={1.5}
                              color="#C9D1D9"
                              m={0}
                              whiteSpace="pre-wrap"
                              wordBreak="break-all"
                            >
                              {logContent || 'No log content available'}
                            </chakra.pre>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Flex>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
