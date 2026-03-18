import { Box, Flex, Text } from '@chakra-ui/react';
import { FileText, Map, CheckSquare, Clock } from 'lucide-react';
import { formatDate } from '../../utils/formatters';
import type { Deliverable } from '@shared/types';

interface TimelineViewProps {
  deliverable: Deliverable;
  expanded: boolean;
}

interface TimelineEntry {
  label: string;
  icon: typeof FileText;
  color: string;
  filename: string;
}


function getTimelineEntries(deliverable: Deliverable): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  if (deliverable.specPath) {
    entries.push({
      label: 'Spec created',
      icon: FileText,
      color: '#60A5FA',
      filename: deliverable.specPath.split('/').pop() || '',
    });
  }

  if (deliverable.planPath) {
    entries.push({
      label: 'Plan created',
      icon: Map,
      color: '#34D399',
      filename: deliverable.planPath.split('/').pop() || '',
    });
  }

  if (deliverable.resultPath) {
    entries.push({
      label: 'Result created',
      icon: CheckSquare,
      color: '#22C55E',
      filename: deliverable.resultPath.split('/').pop() || '',
    });
  }

  if (deliverable.status === 'in-progress') {
    entries.push({
      label: 'Execution in progress',
      icon: Clock,
      color: '#F59E0B',
      filename: '',
    });
  }

  if (deliverable.status === 'complete') {
    entries.push({
      label: 'Completed',
      icon: CheckSquare,
      color: '#22C55E',
      filename: '',
    });
  }

  return entries;
}

export function TimelineView({ deliverable, expanded }: TimelineViewProps) {
  const entries = getTimelineEntries(deliverable);
  const hasEntries = entries.length > 0;

  return (
    <Box
      display="grid"
      gridTemplateRows={expanded ? '1fr' : '0fr'}
      transition={
        expanded
          ? 'grid-template-rows 280ms cubic-bezier(0, 0, 0.2, 1)'
          : 'grid-template-rows 200ms cubic-bezier(0.4, 0, 1, 1)'
      }
    >
      <Box overflow="hidden">
        <Box
          mt="2"
          pt="2"
          borderTop="1px solid"
          borderColor="border.subtle"
        >
          {hasEntries ? (
            <Flex
              direction="column"
              gap="2px"
              position="relative"
            >
              {/* Timeline line */}
              <Box
                position="absolute"
                left="7px"
                top="10px"
                bottom="10px"
                w="1px"
                bg="border.subtle"
              />

              {entries.map((entry, i) => {
                const Icon = entry.icon;
                return (
                  <Flex
                    key={i}
                    align="center"
                    gap="2"
                    h="28px"
                    position="relative"
                  >
                    {/* Dot */}
                    <Flex
                      w="14px"
                      h="14px"
                      align="center"
                      justify="center"
                      flexShrink={0}
                      zIndex={1}
                    >
                      <Icon size={11} color={entry.color} />
                    </Flex>

                    {/* Label */}
                    <Text
                      fontSize="xs"
                      fontWeight={500}
                      color={entry.color}
                      whiteSpace="nowrap"
                    >
                      {entry.label}
                    </Text>

                    {/* Filename */}
                    {entry.filename && (
                      <Text
                        fontSize="xs"
                        color="text.muted"
                        fontFamily="mono"
                        whiteSpace="nowrap"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        flex={1}
                        minW={0}
                      >
                        {entry.filename}
                      </Text>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          ) : (
            <Flex
              h="28px"
              align="center"
              color="text.muted"
              fontSize="xs"
            >
              No artifacts yet
            </Flex>
          )}

          {/* Last modified */}
          <Flex
            h="24px"
            align="center"
            justify="flex-end"
            color="text.muted"
            fontSize="xs"
            fontFamily="mono"
            mt="1"
          >
            Last modified: {formatDate(deliverable.lastModified)}
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}
