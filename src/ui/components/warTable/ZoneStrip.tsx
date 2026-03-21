import { useCallback, useRef } from 'react';
import { Box, Flex, Text } from '@chakra-ui/react';
import type { Deliverable } from '@shared/types';
import type { ZoneViewMode } from '../../stores/dashboardStore';

export type ZoneType = 'deck' | 'playmat' | 'graveyard';

interface ZoneStripProps {
  title: string;
  cards: Deliverable[];
  zoneType: ZoneType;
  zoneViewMode?: ZoneViewMode;
  children?: React.ReactNode;
}

const ZONE_ACCENT: Record<ZoneType, string> = {
  deck: '#A78BFA',
  playmat: '#F59E0B',
  graveyard: '#22C55E',
};

const ZONE_BG: Record<ZoneType, string> = {
  deck: '#1E1A2E',
  playmat: '#2D1A04',
  graveyard: '#052E16',
};

export function ZoneStrip({
  title,
  cards,
  zoneType,
  zoneViewMode = 'zones',
  children,
}: ZoneStripProps) {
  const accent = ZONE_ACCENT[zoneType];
  const zoneBg = ZONE_BG[zoneType];
  const count = cards.length;

  const bodyRef = useRef<HTMLDivElement>(null);

  /** Move focus between focusable card items using Up/Down arrow keys */
  const handleZoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

    const body = bodyRef.current;
    if (!body) return;

    // Collect all focusable card roots inside this zone body
    const focusable = Array.from(
      body.querySelectorAll<HTMLElement>('[role="button"][tabindex="0"], button')
    ).filter((el) => !el.closest('[aria-hidden="true"]'));

    if (focusable.length === 0) return;

    const activeEl = document.activeElement as HTMLElement | null;
    const currentIndex = activeEl ? focusable.indexOf(activeEl) : -1;

    e.preventDefault();
    if (e.key === 'ArrowDown') {
      const next = focusable[currentIndex + 1] ?? focusable[0];
      next.focus();
    } else {
      const prev = focusable[currentIndex - 1] ?? focusable[focusable.length - 1];
      prev.focus();
    }
  }, []);

  return (
    <Flex
      role="region"
      direction="column"
      flex={zoneType === 'playmat' ? '1 1 120px' : '0 0 auto'}
      minH={zoneType === 'playmat' ? '120px' : undefined}
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="md"
      overflow="hidden"
      bg={zoneBg}
      aria-label={`${title}: ${count} card${count !== 1 ? 's' : ''}`}
    >
      {/* Zone header */}
      <Flex
        align="center"
        gap="2"
        px="3"
        py="6px"
        bg="rgba(0,0,0,0.2)"
        borderBottom="1px solid"
        borderColor="border.subtle"
        flexShrink={0}
      >
        {/* Accent pip */}
        <Box
          w="6px"
          h="6px"
          borderRadius="full"
          bg={accent}
          flexShrink={0}
        />
        <Text
          fontSize="xs"
          fontWeight={600}
          letterSpacing="0.06em"
          textTransform="uppercase"
          color="text.secondary"
          flex={1}
        >
          {title}
        </Text>
        <Text
          fontSize="xs"
          fontWeight={600}
          color={count > 0 ? accent : 'text.muted'}
          fontFamily="mono"
        >
          {count}
        </Text>
      </Flex>

      {/* Scrollable body */}
      <Box
        ref={bodyRef as React.RefObject<HTMLDivElement>}
        className="zone-strip-body"
        flex={1}
        overflowY="auto"
        p="2"
        display="flex"
        flexDirection={zoneViewMode === 'list' ? 'column' : 'row'}
        flexWrap={zoneViewMode === 'zones' ? 'wrap' : undefined}
        gap="1"
        alignContent="flex-start"
        onKeyDown={handleZoneKeyDown}
      >
        {children}
        {cards.length === 0 && (
          <Flex
            align="center"
            justify="center"
            w="100%"
            minH="32px"
            color="text.muted"
            fontSize="xs"
            fontStyle="italic"
          >
            Empty
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
