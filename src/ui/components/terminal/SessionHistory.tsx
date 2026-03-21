import { useCallback, useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { History, Search, ChevronDown, Terminal, FileText, CheckCircle, XCircle, Zap, ChevronRight, User, Bot, Info, TerminalSquare } from 'lucide-react';
import { useSessionHistory } from '../../hooks/useSessionHistory';
import { formatDate } from '../../utils/formatters';
import { parseLogContent, type LogSegment, type TaskNotification, type SlashCommand } from '../../../shared/parseLogContent.js';

interface SessionHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function TaskNotificationCard({ data }: { data: TaskNotification }) {
  const isCompleted = data.status === 'completed';
  const isError = data.status === 'error' || data.status === 'failed';
  const accent = isError ? '#F87171' : isCompleted ? '#22C55E' : '#60A5FA';
  const Icon = isError ? XCircle : isCompleted ? CheckCircle : Zap;

  return (
    <Box
      my="2"
      p="3"
      bg="rgba(255,255,255,0.03)"
      border="1px solid"
      borderColor="border.subtle"
      borderLeft="3px solid"
      borderLeftColor={accent}
      borderRadius="md"
    >
      <Flex align="center" gap="2" mb="1">
        <Icon size={13} color={accent} style={{ flexShrink: 0 }} />
        <Text fontSize="xs" fontWeight={600} color={accent} textTransform="uppercase" letterSpacing="0.04em">
          {data.status}
        </Text>
        <Text fontSize="xs" color="text.muted" fontFamily="mono" ml="auto">
          {data.taskId}
        </Text>
      </Flex>
      <Text fontSize="sm" color="text.primary" lineHeight={1.5}>
        {data.summary}
      </Text>
      {data.outputFile && (
        <Text fontSize="xs" color="text.muted" fontFamily="mono" mt="1" wordBreak="break-all">
          {data.outputFile}
        </Text>
      )}
    </Box>
  );
}

function CommandBadge({ data }: { data: SlashCommand }) {
  return (
    <Flex
      display="inline-flex"
      align="center"
      gap="1"
      my="1"
      px="2"
      py="3px"
      bg="rgba(96,165,250,0.1)"
      border="1px solid"
      borderColor="rgba(96,165,250,0.25)"
      borderRadius="sm"
      fontSize="xs"
      fontFamily="mono"
    >
      <TerminalSquare size={11} color="#60A5FA" style={{ flexShrink: 0 }} />
      <Text as="span" color="#60A5FA" fontWeight={600}>{data.name}</Text>
      {data.args && (
        <Text as="span" color="text.muted" maxW="300px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {data.args}
        </Text>
      )}
    </Flex>
  );
}

function TurnHeader({ role }: { role: 'user' | 'assistant' }) {
  const isUser = role === 'user';
  const Icon = isUser ? User : Bot;
  const color = isUser ? '#FBBF24' : '#22D3EE';
  const label = isUser ? 'User' : 'Assistant';

  return (
    <Flex
      align="center"
      gap="2"
      my="2"
      py="1"
      borderBottom="1px solid"
      borderColor="border.subtle"
    >
      <Icon size={12} color={color} style={{ flexShrink: 0 }} />
      <Text fontSize="xs" fontWeight={700} color={color} textTransform="uppercase" letterSpacing="0.05em">
        {label}
      </Text>
    </Flex>
  );
}

function SystemReminderCollapsed() {
  return (
    <Flex
      display="inline-flex"
      align="center"
      gap="1"
      my="1"
      px="2"
      py="2px"
      bg="rgba(255,255,255,0.03)"
      borderRadius="sm"
      fontSize="0.625rem"
      color="text.muted"
    >
      <Info size={10} style={{ flexShrink: 0 }} />
      <Text as="span">system context</Text>
    </Flex>
  );
}

function CaveatBlock({ content }: { content: string }) {
  return (
    <Box
      my="2"
      p="2 3"
      bg="rgba(251,191,36,0.06)"
      border="1px solid"
      borderColor="rgba(251,191,36,0.2)"
      borderRadius="md"
      fontSize="xs"
      color="text.secondary"
      lineHeight={1.5}
    >
      {content}
    </Box>
  );
}

function FormattedLogContent({ segments }: { segments: LogSegment[] }) {
  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case 'task-notification':
            return <TaskNotificationCard key={i} data={seg.data} />;
          case 'command':
            return <CommandBadge key={i} data={seg.data} />;
          case 'turn-header':
            return <TurnHeader key={i} role={seg.role} />;
          case 'system-reminder':
            return <SystemReminderCollapsed key={i} />;
          case 'caveat':
            return <CaveatBlock key={i} content={seg.content} />;
          case 'text':
            return (
              <chakra.span key={i} whiteSpace="pre-wrap" wordBreak="break-all">
                {seg.content}
              </chakra.span>
            );
        }
      })}
    </>
  );
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
                          ) : logContent ? (
                            <Box
                              fontFamily="mono"
                              fontSize="xs"
                              lineHeight={1.5}
                              color="#C9D1D9"
                            >
                              <FormattedLogContent segments={parseLogContent(logContent)} />
                            </Box>
                          ) : (
                            <Text color="text.muted" fontSize="sm">
                              No log content available
                            </Text>
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
