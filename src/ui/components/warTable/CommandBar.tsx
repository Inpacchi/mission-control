import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { Rocket } from 'lucide-react';
import { ProjectSwitcher } from '../layout/ProjectSwitcher';
import { StatsBar } from '../layout/StatsBar';
import { useDashboardStore, type ActiveProject, type LayoutPreset } from '../../stores/dashboardStore';
import type { SdlcStats } from '@shared/types';

interface CommandBarProps {
  projects: ActiveProject[];
  onSwitchProject: (project: ActiveProject) => void;
  stats: SdlcStats | null;
  loading: boolean;
  wsConnected: boolean;
}

interface PresetDef {
  id: LayoutPreset;
  label: string;
  widths: { left: number; center: number; right: number };
}

const PRESETS: PresetDef[] = [
  { id: 'terminal', label: 'Terminal Focus', widths: { left: 45, center: 25, right: 30 } },
  { id: 'balanced', label: 'Balanced', widths: { left: 30, center: 40, right: 30 } },
  { id: 'intel', label: 'Intel Focus', widths: { left: 25, center: 30, right: 45 } },
];

export function CommandBar({
  projects,
  onSwitchProject,
  stats,
  loading,
  wsConnected,
}: CommandBarProps) {
  const {
    activeProject,
    activePreset,
    setColumnWidths,
    setActivePreset,
  } = useDashboardStore();

  return (
    <Flex
      as="header"
      align="center"
      h="40px"
      minH="40px"
      px="4"
      gap="3"
      bg="bg.base"
      borderBottom="1px solid"
      borderColor="border.subtle"
      flexShrink={0}
      position="relative"
    >
      {/* Scan-line texture overlay */}
      <Box
        position="absolute"
        inset="0"
        background="repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)"
        pointerEvents="none"
        zIndex={0}
        h="40px"
        overflow="hidden"
      />
      {/* Amber bottom glow */}
      <Box
        position="absolute"
        bottom="-1px"
        left="0"
        right="0"
        h="1px"
        background="linear-gradient(90deg, transparent, rgba(245,158,11,0.15), transparent)"
        pointerEvents="none"
        zIndex={1}
      />
      {/* Left: Logo + project name / switcher */}
      <Flex align="center" gap="8px" minW="180px" position="relative" zIndex={2}>
        <Rocket size={16} color="#8B5CF6" />
        {projects.length > 1 ? (
          <ProjectSwitcher projects={projects} onSwitch={onSwitchProject} />
        ) : (
          <Text
            fontSize="base"
            fontWeight={700}
            letterSpacing="-0.03em"
            color="text.primary"
            fontFamily="heading"
            lineHeight={1.2}
          >
            {activeProject?.name ?? 'Mission Control'}
          </Text>
        )}
      </Flex>

      {/* Center: Stats HUD */}
      <Flex flex={1} justify="center" align="center" position="relative" zIndex={2}>
        <StatsBar stats={stats} loading={loading} />
      </Flex>

      {/* Right: Preset toggles + connection indicator */}
      <Flex align="center" gap="2" flexShrink={0} position="relative" zIndex={2}>
        {/* Layout preset buttons */}
        <Flex
          align="center"
          gap="1"
          bg="bg.surface"
          border="1px solid"
          borderColor="border.subtle"
          borderRadius="md"
          p="2px"
        >
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <chakra.button
                key={preset.id}
                onClick={() => {
                  setColumnWidths(preset.widths);
                  setActivePreset(preset.id);
                }}
                aria-label={`Layout: ${preset.label}`}
                aria-pressed={isActive}
                px="8px"
                py="3px"
                bg={isActive ? 'bg.elevated' : 'transparent'}
                border={isActive ? '1px solid' : '1px solid transparent'}
                borderColor={isActive ? 'border.accent' : 'transparent'}
                borderRadius="sm"
                color={isActive ? 'text.accent' : 'text.muted'}
                fontSize="xs"
                fontWeight={isActive ? 600 : 500}
                cursor="pointer"
                fontFamily="body"
                transition="all 120ms ease"
                outline="none"
                _focusVisible={{ outline: 'none', boxShadow: '0 0 0 3px rgba(47,116,208,0.5)' }}
              >
                {preset.label}
              </chakra.button>
            );
          })}
        </Flex>

        {/* Connection indicator */}
        <Flex align="center" gap="1.5">
          <Box
            w="7px"
            h="7px"
            borderRadius="full"
            bg={wsConnected ? 'semantic.success' : 'semantic.error'}
            transition="background-color 200ms ease"
          />
          <Text fontSize="xs" color="text.muted">
            {wsConnected ? 'Live' : 'Offline'}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
}
