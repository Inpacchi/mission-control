import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Flex } from '@chakra-ui/react';
import type { Deliverable } from '@shared/types';
import { useDashboardStore } from '../../stores/dashboardStore';
import { STATUS_ACCENT } from '../../utils/rarity';
import { MiniCard } from '../cards/MiniCard';
import { ZoneStrip } from './ZoneStrip';
import { PackRevealAnimation } from '../cards/animations/PackRevealAnimation';
import { CompletionCelebration } from '../cards/animations/CompletionCelebration';

interface TacticalFieldProps {
  deliverables: Deliverable[];
}

export function TacticalField({ deliverables }: TacticalFieldProps) {
  const zoneViewMode = useDashboardStore((s) => s.zoneViewMode);
  const setIntelCard = useDashboardStore((s) => s.setIntelCard);

  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const deckCards = useMemo(
    () => deliverables.filter((d) => d.status === 'idea'),
    [deliverables]
  );

  const activeCards = useMemo(
    () =>
      deliverables.filter(
        (d) =>
          d.status === 'spec' ||
          d.status === 'plan' ||
          d.status === 'in-progress' ||
          d.status === 'blocked'
      ),
    [deliverables]
  );

  const reviewCards = useMemo(
    () => deliverables.filter((d) => d.status === 'review'),
    [deliverables]
  );

  const graveyardCards = useMemo(
    () => deliverables.filter((d) => d.status === 'complete'),
    [deliverables]
  );

  const handleExpand = useCallback(
    (id: string) => {
      setExpandedCardId((prev) => (prev === id ? null : id));
    },
    []
  );

  const handleSelect = useCallback(
    (id: string) => {
      setIntelCard(id);
    },
    [setIntelCard]
  );

  // Click-outside: clicking zone background (the ref target) collapses expanded card
  const fieldRef = useRef<HTMLDivElement>(null);

  const handleFieldClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only collapse if the click target is the field itself or a zone-strip-body
    const target = e.target as HTMLElement;
    const isBackground =
      target === fieldRef.current ||
      target.classList.contains('zone-strip-body');
    if (isBackground) {
      setExpandedCardId(null);
    }
  }, []);

  const renderCards = useCallback(
    (cards: Deliverable[]) =>
      cards.map((d) => {
        const accent = STATUS_ACCENT[d.status as keyof typeof STATUS_ACCENT] ?? '#A78BFA';
        return (
          <Box
            key={d.id}
            style={{ '--card-accent': accent } as React.CSSProperties}
          >
            <PackRevealAnimation createdAt={d.createdAt}>
              <CompletionCelebration
                status={d.status}
                lastModified={d.lastModified}
              >
                <MiniCard
                  deliverable={d}
                  isExpanded={expandedCardId === d.id}
                  onExpand={() => handleExpand(d.id)}
                  onSelect={() => handleSelect(d.id)}
                />
              </CompletionCelebration>
            </PackRevealAnimation>
          </Box>
        );
      }),
    [expandedCardId, handleExpand, handleSelect]
  );

  return (
    <Flex
      ref={fieldRef as React.RefObject<HTMLDivElement>}
      direction="column"
      h="100%"
      overflow="hidden"
      gap="2"
      p="2"
      onClick={handleFieldClick}
    >
      {/* Deck — Ideas: shrinks first when space is constrained */}
      <ZoneStrip
        title="Deck"
        cards={deckCards}
        zoneType="deck"
        zoneViewMode={zoneViewMode}
      >
        {renderCards(deckCards)}
      </ZoneStrip>

      {/* Active Zone — spec/plan/in-progress/blocked: min 120px, grows to fill */}
      <ZoneStrip
        title="Active Zone"
        cards={activeCards}
        zoneType="active"
        zoneViewMode={zoneViewMode}
      >
        {renderCards(activeCards)}
      </ZoneStrip>

      {/* Review Strip: shrinks first */}
      <ZoneStrip
        title="Review"
        cards={reviewCards}
        zoneType="review"
        zoneViewMode={zoneViewMode}
      >
        {renderCards(reviewCards)}
      </ZoneStrip>

      {/* Graveyard — complete: shrinks first */}
      <ZoneStrip
        title="Graveyard"
        cards={graveyardCards}
        zoneType="graveyard"
        zoneViewMode={zoneViewMode}
      >
        {renderCards(graveyardCards)}
      </ZoneStrip>
    </Flex>
  );
}
