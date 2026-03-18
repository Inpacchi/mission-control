import { Flex, Text } from '@chakra-ui/react';
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

const emptyStateMessages: Record<string, string> = {
  Idea: 'No ideas yet',
  Spec: 'No specs',
  Plan: 'No plans',
  'In Progress': 'Nothing in progress',
  Review: 'Nothing to review',
  Complete: 'Nothing completed yet',
  Blocked: 'Nothing blocked',
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

export function KanbanColumn({ label, deliverables, color, wsSend }: KanbanColumnProps) {
  const count = deliverables.length;

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
        borderRadius="md md 0 0"
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

        {/* Count badge */}
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
            <Text
              fontSize="sm"
              color="text.muted"
            >
              {emptyStateMessages[label] || 'Empty'}
            </Text>
          </Flex>
        ) : (
          deliverables.map((d) => (
            <DeliverableCard
              key={d.id}
              deliverable={d}
              columnColor={color}
              wsSend={wsSend}
            />
          ))
        )}
      </Flex>
    </Flex>
  );
}
