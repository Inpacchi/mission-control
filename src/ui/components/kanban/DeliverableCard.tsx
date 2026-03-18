import { useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { ChevronDown } from 'lucide-react';
import { SkillActions } from './SkillActions';
import { TimelineView } from './TimelineView';
import { useDashboardStore } from '../../stores/dashboardStore';
import { formatDate } from '../../utils/formatters';
import type { Deliverable, DeliverableStatus, WsMessage } from '@shared/types';

interface DeliverableCardProps {
  deliverable: Deliverable;
  columnColor: string;
  wsSend: (msg: WsMessage) => void;
}

const statusBadgeColors: Record<DeliverableStatus, { bg: string; text: string; border: string }> = {
  idea: { bg: '#1E1A2E', text: '#A78BFA', border: '#A78BFA40' },
  spec: { bg: '#0A1628', text: '#60A5FA', border: '#60A5FA40' },
  plan: { bg: '#0A2B1E', text: '#34D399', border: '#34D39940' },
  'in-progress': { bg: '#2D1A04', text: '#F59E0B', border: '#F59E0B40' },
  review: { bg: '#2D1602', text: '#FB923C', border: '#FB923C40' },
  complete: { bg: '#052E16', text: '#22C55E', border: '#22C55E40' },
  blocked: { bg: '#2D0A0A', text: '#F87171', border: '#F8717140' },
};

const statusLabels: Record<DeliverableStatus, string> = {
  idea: 'IDEA',
  spec: 'SPEC',
  plan: 'PLAN',
  'in-progress': 'IN PROGRESS',
  review: 'REVIEW',
  complete: 'COMPLETE',
  blocked: 'BLOCKED',
};

/** Doc-type accent colors for artifact pills */
const artifactColors = {
  spec: '#60A5FA',
  plan: '#34D399',
  result: '#22C55E',
} as const;

export function DeliverableCard({ deliverable, columnColor, wsSend }: DeliverableCardProps) {
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { selectedCardId, setSelectedCard } = useDashboardStore();

  const isSelected = selectedCardId === deliverable.id;
  const badge = statusBadgeColors[deliverable.status];

  const hasArtifacts =
    Boolean(deliverable.specPath) ||
    Boolean(deliverable.planPath) ||
    Boolean(deliverable.resultPath);

  const collapsedHeight = hasArtifacts ? '108px' : '88px';

  const handleCardClick = () => {
    setSelectedCard(isSelected ? null : deliverable.id);
  };

  const handleExpandToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`View ${deliverable.name}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      h={expanded ? 'auto' : collapsedHeight}
      minH={collapsedHeight}
      bg={hovered || isSelected ? 'bg.overlay' : 'bg.elevated'}
      border="1px solid"
      borderColor={isSelected ? 'border.accent' : 'border.subtle'}
      borderLeft="3px solid"
      borderLeftColor={columnColor}
      borderRadius="md"
      boxShadow={isSelected ? 'selected' : hovered ? 'md' : 'sm'}
      p="3"
      cursor="pointer"
      transition="background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1), border-color 200ms cubic-bezier(0.4, 0, 0.2, 1)"
      overflow="hidden"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Row 1: ID + Name */}
      <Flex
        align="flex-start"
        gap="2"
        minH="28px"
      >
        {/* ID Badge */}
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
          mt="2px"
        >
          {deliverable.id.toUpperCase()}
        </Text>

        {/* Name — wraps to max 2 lines */}
        <Text
          as="span"
          fontSize="base"
          fontWeight={500}
          color="text.primary"
          flex={1}
          minW={0}
          lineClamp={2}
          lineHeight={1.4}
        >
          {deliverable.name}
        </Text>

        {/* Skill action icon (hover) */}
        <Box flexShrink={0} mt="2px">
          <SkillActions
            status={deliverable.status}
            deliverableId={deliverable.id}
            visible={hovered}
            wsSend={wsSend}
          />
        </Box>
      </Flex>

      {/* Row 2: Status badge + timestamp */}
      <Flex
        align="center"
        gap="2"
        mt="2"
        h="20px"
        minH="20px"
      >
        {/* Status badge */}
        <Text
          as="span"
          display="inline-flex"
          alignItems="center"
          p="2px 8px"
          bg={badge.bg}
          color={badge.text}
          border={`1px solid ${badge.border}`}
          borderRadius="full"
          fontSize="xs"
          fontWeight={600}
          letterSpacing="0.03em"
          textTransform="uppercase"
          lineHeight={1.4}
        >
          {statusLabels[deliverable.status]}
        </Text>

        <Box flex={1} />

        {/* Timestamp */}
        <Text
          as="span"
          fontSize="xs"
          fontWeight={400}
          lineHeight={1.4}
          letterSpacing="0.02em"
          color="text.muted"
          whiteSpace="nowrap"
          fontFamily="mono"
        >
          {formatDate(deliverable.lastModified)}
        </Text>

        {/* Expand chevron */}
        <chakra.button
          onClick={handleExpandToggle}
          aria-label={expanded ? 'Hide timeline' : 'Show timeline'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          w="20px"
          h="20px"
          border="none"
          bg="transparent"
          color="text.muted"
          cursor="pointer"
          p={0}
          transition="color 150ms ease, transform 200ms cubic-bezier(0.4, 0, 0.2, 1)"
          transform={expanded ? 'rotate(180deg)' : 'rotate(0deg)'}
          flexShrink={0}
          _hover={{ color: 'text.secondary' }}
        >
          <ChevronDown size={14} />
        </chakra.button>
      </Flex>

      {/* Row 3: Artifact pills (only when artifacts exist) */}
      {hasArtifacts && (
        <Flex
          align="center"
          gap="1"
          mt="2"
          flexWrap="wrap"
        >
          {deliverable.specPath && (
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              px="6px"
              py="1px"
              bg={`${artifactColors.spec}1A`}
              color={artifactColors.spec}
              border={`1px solid ${artifactColors.spec}33`}
              borderRadius="full"
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.04em"
              textTransform="uppercase"
              lineHeight={1.4}
            >
              SPEC
            </Text>
          )}
          {deliverable.planPath && (
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              px="6px"
              py="1px"
              bg={`${artifactColors.plan}1A`}
              color={artifactColors.plan}
              border={`1px solid ${artifactColors.plan}33`}
              borderRadius="full"
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.04em"
              textTransform="uppercase"
              lineHeight={1.4}
            >
              PLAN
            </Text>
          )}
          {deliverable.resultPath && (
            <Text
              as="span"
              display="inline-flex"
              alignItems="center"
              px="6px"
              py="1px"
              bg={`${artifactColors.result}1A`}
              color={artifactColors.result}
              border={`1px solid ${artifactColors.result}33`}
              borderRadius="full"
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.04em"
              textTransform="uppercase"
              lineHeight={1.4}
            >
              RESULT
            </Text>
          )}
        </Flex>
      )}

      {/* Expandable timeline */}
      <TimelineView deliverable={deliverable} expanded={expanded} />
    </Box>
  );
}
