import { useCallback, useEffect, useRef, useState, forwardRef } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import { X } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';

export function TerminalTabs() {
  const { sessions, activeSessionId, setActiveSession, removeSession } =
    useDashboardStore();

  const runningSessions = sessions.filter((s) => s.status === 'running' || s.status === 'exited');
  const tabRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    if (!activeSessionId) {
      setIndicatorStyle({ left: 0, width: 0 });
      return;
    }
    const tabEl = tabRefs.current.get(activeSessionId);
    if (tabEl) {
      setIndicatorStyle({ left: tabEl.offsetLeft, width: tabEl.offsetWidth });
    }
  }, [activeSessionId]);

  useEffect(() => {
    updateIndicator();
  }, [activeSessionId, runningSessions.length, updateIndicator]);

  if (runningSessions.length === 0) {
    return (
      <Flex
        align="center"
        h="100%"
        pl="3"
        color="text.muted"
        fontSize="sm"
        fontWeight={500}
      >
        No sessions
      </Flex>
    );
  }

  return (
    <Flex
      ref={containerRef}
      role="tablist"
      align="stretch"
      h="100%"
      overflow="hidden"
      position="relative"
    >
      {runningSessions.map((session) => (
        <Tab
          key={session.id}
          ref={(el) => {
            tabRefs.current.set(session.id, el);
          }}
          sessionId={session.id}
          label={session.command?.split(' ').slice(0, 2).join(' ') || `Session`}
          isActive={activeSessionId === session.id}
          isExited={session.status === 'exited'}
          onSelect={() => setActiveSession(session.id)}
          onClose={() => removeSession(session.id)}
        />
      ))}

      {/* Sliding underline indicator */}
      <Box
        position="absolute"
        bottom={0}
        left={`${indicatorStyle.left}px`}
        w={`${indicatorStyle.width}px`}
        h="2px"
        bg="accent.violet.400"
        transition="left 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)"
        pointerEvents="none"
      />
    </Flex>
  );
}

interface TabProps {
  sessionId: string;
  label: string;
  isActive: boolean;
  isExited: boolean;
  onSelect: () => void;
  onClose: () => void;
}

const Tab = forwardRef<HTMLDivElement, TabProps>(
  function Tab({ sessionId: _sessionId, label, isActive, isExited, onSelect, onClose }, ref) {
    const [hovered, setHovered] = useState(false);

    return (
      <Flex
        ref={ref}
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={onSelect}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        align="center"
        gap="2"
        px="4"
        h="100%"
        cursor="pointer"
        bg={isActive ? 'bg.elevated' : hovered ? 'bg.overlay' : 'transparent'}
        borderRight="1px solid"
        borderColor="border.subtle"
        color={isActive ? 'text.primary' : hovered ? 'text.primary' : 'text.secondary'}
        fontSize="sm"
        fontWeight={500}
        transition="background-color 150ms ease, color 150ms ease"
        position="relative"
        maxW="180px"
        minW="80px"
      >
        {/* Session status dot */}
        <Box
          w="6px"
          h="6px"
          borderRadius="full"
          bg={isExited ? 'semantic.error' : 'semantic.success'}
          flexShrink={0}
        />

        {/* Label */}
        <Text
          as="span"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          flex={1}
        >
          {label}
        </Text>

        {/* Close button */}
        <Flex
          as="button"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Kill session"
          align="center"
          justify="center"
          w="14px"
          h="14px"
          border="none"
          bg="transparent"
          color="text.muted"
          cursor="pointer"
          p={0}
          opacity={hovered || isActive ? 1 : 0}
          transition="opacity 150ms ease, color 100ms ease"
          borderRadius="2px"
          flexShrink={0}
          _hover={{ color: 'text.secondary' }}
        >
          <X size={12} />
        </Flex>
      </Flex>
    );
  }
);
