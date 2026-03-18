import { Box, Flex, Text } from '@chakra-ui/react';
import type { SdlcStats } from '@shared/types';

interface StatsBarProps {
  stats: SdlcStats | null;
  loading: boolean;
}

interface StatItemProps {
  value: number;
  label: string;
  color: string;
  loading: boolean;
}

function StatItem({ value, label, color, loading }: StatItemProps) {
  return (
    <Flex direction="column" align="center" gap="2px">
      <Text
        fontSize="xl"
        fontWeight={700}
        lineHeight={1.3}
        letterSpacing="-0.02em"
        color={color}
        filter={loading ? 'blur(2px)' : 'none'}
        opacity={loading ? 0.5 : 1}
        transition="filter 200ms ease, opacity 200ms ease"
      >
        {value}
      </Text>
      <Text
        fontSize="xs"
        fontWeight={400}
        lineHeight={1.4}
        letterSpacing="0.06em"
        color="text.muted"
        textTransform="uppercase"
      >
        {label}
      </Text>
    </Flex>
  );
}

function Divider() {
  return (
    <Box
      w="1px"
      h="28px"
      bg="border.subtle"
      alignSelf="center"
    />
  );
}

export function StatsBar({ stats, loading }: StatsBarProps) {
  const total = stats?.total ?? 0;
  const inProgress = stats?.byStatus?.['in-progress'] ?? 0;
  const blocked = stats?.byStatus?.blocked ?? 0;
  const complete = stats?.byStatus?.complete ?? 0;
  const untracked = stats?.untracked ?? 0;

  return (
    <Flex
      aria-live="polite"
      align="center"
      gap="6"
      h="100%"
    >
      <StatItem value={total} label="Total" color="text.primary" loading={loading} />
      <Divider />
      <StatItem value={inProgress} label="In Progress" color="semantic.warning" loading={loading} />
      <Divider />
      <StatItem value={blocked} label="Blocked" color="semantic.error" loading={loading} />
      <Divider />
      <StatItem value={complete} label="Complete" color="semantic.success" loading={loading} />
      <Divider />
      <StatItem value={untracked} label="Untracked" color="accent.violet.300" loading={loading} />
    </Flex>
  );
}
