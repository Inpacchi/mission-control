import { useState } from 'react';
import { Flex, Text, chakra } from '@chakra-ui/react';
import {
  Lightbulb,
  FileText,
  Map,
  Cog,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { DeliverableCard } from './DeliverableCard';
import { useDashboardStore } from '../../stores/dashboardStore';
import type { Deliverable, DeliverableStatus, WsMessage } from '@shared/types';

interface KanbanColumnProps {
  label: string;
  statuses: DeliverableStatus[];
  deliverables: Deliverable[];
  color: string;
  wsSend: (msg: WsMessage) => void;
}

const emptyStateIcons: Record<string, React.ReactNode> = {
  Idea: <Lightbulb size={24} color="#4E5C72" />,
  Spec: <FileText size={24} color="#4E5C72" />,
  Plan: <Map size={24} color="#4E5C72" />,
  'In Progress': <Cog size={24} color="#4E5C72" />,
  Review: <Eye size={24} color="#4E5C72" />,
  Complete: <CheckCircle size={24} color="#4E5C72" />,
  Blocked: <AlertTriangle size={24} color="#4E5C72" />,
};

const emptyCTALabels: Record<string, string> = {
  Idea: '+ New Idea',
  Spec: '+ Write Spec',
  Plan: '+ Create Plan',
  'In Progress': '+ Start Work',
  Review: '+ Submit for Review',
};

/** Maps column label to the SDLC skill command to pre-fill in the terminal */
const columnSkillCommands: Record<string, string> = {
  Idea: '/sdlc-planning',
  Spec: '/sdlc-planning',
  Plan: '/sdlc-planning',
  'In Progress': '/sdlc-execution',
  Review: '/commit-review',
};

const columnHeaderBgMap: Record<string, string> = {
  Idea: '#1E1A2E',
  Spec: '#0A1628',
  Plan: '#0A2B1E',
  'In Progress': '#2D1A04',
  Review: '#2D1602',
  Complete: '#052E16',
  Blocked: '#2D0A0A',
};

export function KanbanColumn({ label, deliverables, color, wsSend: _wsSend }: KanbanColumnProps) {
  const count = deliverables.length;
  const [ctaHovered, setCtaHovered] = useState(false);
  const { addSession, toggleTerminal } = useDashboardStore();

  const ctaLabel = emptyCTALabels[label];
  const skillCommand = columnSkillCommands[label];
  const [dispatching, setDispatching] = useState(false);

  const handleCTAClick = async () => {
    if (!skillCommand || dispatching) return;
    setDispatching(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: skillCommand }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.session) {
        addSession(data.session);
        toggleTerminal(false); // expand terminal
      }
    } catch (err) {
      console.error('Failed to open terminal session:', err);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Flex
      w="260px"
      minW="260px"
      direction="column"
      h="100%"
    >
      {/* Column header */}
      <Flex
        h="52px"
        minH="52px"
        align="center"
        justify="space-between"
        px="3"
        bg={columnHeaderBgMap[label] || `${color}14`}
        borderTop={`2px solid ${color}99`}
        borderBottom="1px solid"
        borderBottomColor="border.subtle"
        borderTopLeftRadius="md"
        borderTopRightRadius="md"
      >
        <Text
          fontSize="lg"
          fontWeight={600}
          lineHeight={1.4}
          letterSpacing="-0.01em"
          color={color}
        >
          {label}
        </Text>

        {/* Count badge — pill when count > 0, plain muted text when zero */}
        {count > 0 ? (
          <Flex
            as="span"
            align="center"
            justify="center"
            minW="22px"
            h="22px"
            px="6px"
            borderRadius="full"
            bg={`${color}26`}
            color={color}
            fontSize="sm"
            fontWeight={700}
          >
            {count}
          </Flex>
        ) : (
          <Text
            as="span"
            fontSize="sm"
            fontWeight={700}
            color="text.muted"
          >
            {count}
          </Text>
        )}
      </Flex>

      {/* Card list */}
      <Flex
        className="kanban-column-body"
        role="list"
        aria-label={`${label} column, ${count} items`}
        flex={1}
        overflowY="auto"
        p="2"
        direction="column"
        gap="2"
        bg="bg.surface"
      >
        {deliverables.length === 0 ? (
          <Flex
            minH="80px"
            direction="column"
            align="center"
            justify="center"
            gap="2"
          >
            {emptyStateIcons[label] || <Lightbulb size={24} color="#4E5C72" />}
            {ctaLabel ? (
              <chakra.button
                onClick={handleCTAClick}
                onMouseEnter={() => setCtaHovered(true)}
                onMouseLeave={() => setCtaHovered(false)}
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                px="3"
                py="6px"
                bg={ctaHovered ? `${color}0D` : 'transparent'}
                border="1px dashed"
                borderColor={ctaHovered ? `${color}66` : 'border.subtle'}
                borderRadius="md"
                color={ctaHovered ? color : 'text.muted'}
                fontSize="xs"
                fontWeight={500}
                fontFamily="body"
                cursor="pointer"
                transition="background-color 150ms ease, border-color 150ms ease, color 150ms ease"
              >
                {ctaLabel}
              </chakra.button>
            ) : (
              <Text
                fontSize="sm"
                color="text.muted"
              >
                {label === 'Complete' ? 'Nothing completed yet' : label === 'Blocked' ? 'Nothing blocked' : 'Empty'}
              </Text>
            )}
          </Flex>
        ) : (
          deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              columnColor={color}
              wsSend={_wsSend}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
