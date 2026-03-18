import { useCallback, useEffect, useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { AlertCircle, Archive, ChevronDown, Search } from 'lucide-react';
import type { ChronicleEntry } from '@shared/types';

interface ChronicleBrowserProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function ChronicleBrowser({ isOpen, onToggle }: ChronicleBrowserProps) {
  const [entries, setEntries] = useState<ChronicleEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchChronicle = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/sdlc/chronicle');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEntries(data.deliverables ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chronicle');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when expanded
  useEffect(() => {
    if (isOpen && entries.length === 0) {
      fetchChronicle();
    }
  }, [isOpen, entries.length, fetchChronicle]);

  const filtered = entries.filter((entry) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.id.toLowerCase().includes(q) ||
      entry.name.toLowerCase().includes(q) ||
      entry.concept.toLowerCase().includes(q)
    );
  });

  // Group by concept
  const grouped = filtered.reduce<Record<string, ChronicleEntry[]>>((acc, entry) => {
    const key = entry.concept || 'Uncategorized';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

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
        <Archive size={16} color="#A78BFA" />
        <Text
          fontSize="md"
          fontWeight={600}
          letterSpacing="-0.01em"
          flex={1}
          textAlign="left"
        >
          Chronicle
        </Text>
        <Text
          fontSize="xs"
          color="text.muted"
          fontWeight={500}
        >
          {entries.length} archived
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
            {/* Search */}
            <Flex
              align="center"
              gap="2"
              px="3"
              py="6px"
              bg="bg.input"
              border="1px solid"
              borderColor="border.subtle"
              borderRadius="md"
              mb="3"
            >
              <Search size={14} color="#4E5C72" />
              <chakra.input
                type="text"
                placeholder="Search by name, ID, or concept..."
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
              <Flex
                align="center"
                gap="2"
                p="2 3"
                bg="semantic.error.bg"
                borderRadius="md"
                color="semantic.error"
                fontSize="sm"
              >
                <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
                {error}
              </Flex>
            )}

            {!loading && !error && filtered.length === 0 && (
              <Text
                textAlign="center"
                p="4"
                color="text.muted"
                fontSize="sm"
              >
                {entries.length === 0
                  ? 'No archived deliverables yet'
                  : 'No matching entries'}
              </Text>
            )}

            {!loading &&
              !error &&
              Object.entries(grouped).map(([concept, items]) => (
                <Box key={concept} mb="3">
                  {/* Concept group header */}
                  <Text
                    fontSize="xs"
                    fontWeight={600}
                    color="text.muted"
                    textTransform="uppercase"
                    letterSpacing="0.06em"
                    mb="6px"
                  >
                    {concept}
                  </Text>

                  {/* Items */}
                  <Flex direction="column" gap="1">
                    {items.map((entry) => (
                      <Flex
                        key={entry.id}
                        align="center"
                        gap="2"
                        p="6px 10px"
                        borderRadius="sm"
                        transition="background-color 100ms ease"
                        cursor="default"
                        _hover={{ bg: 'bg.elevated' }}
                      >
                        <Text
                          as="span"
                          display="inline-flex"
                          alignItems="center"
                          p="1px 5px"
                          bg="bg.canvas"
                          border="1px solid"
                          borderColor="border.subtle"
                          borderRadius="sm"
                          fontFamily="mono"
                          fontSize="xs"
                          fontWeight={600}
                          color="semantic.success"
                          flexShrink={0}
                        >
                          {entry.id.toUpperCase()}
                        </Text>
                        <Text
                          as="span"
                          fontSize="0.8125rem"
                          fontWeight={500}
                          color="text.primary"
                          whiteSpace="nowrap"
                          overflow="hidden"
                          textOverflow="ellipsis"
                          flex={1}
                          minW={0}
                        >
                          {entry.name}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </Box>
              ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
