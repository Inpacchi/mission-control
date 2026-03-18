import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { ChevronDown, FolderOpen, AlertTriangle, Check } from 'lucide-react';
import { useDashboardStore, type ActiveProject } from '../../stores/dashboardStore';
import { useButtonPress } from '../../hooks/useButtonPress';

interface ProjectSwitcherProps {
  projects: ActiveProject[];
  onSwitch: (project: ActiveProject) => void;
}

export function ProjectSwitcher({ projects, onSwitch }: ProjectSwitcherProps) {
  const { activeProject, sessions } = useDashboardStore();
  const [open, setOpen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingProject, setPendingProject] = useState<ActiveProject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerPress = useButtonPress();

  const activeSessions = sessions.filter((s) => s.status === 'running');

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowWarning(false);
        setPendingProject(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowWarning(false);
        setPendingProject(null);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleSelect = useCallback(
    (project: ActiveProject) => {
      if (project.path === activeProject?.path) {
        setOpen(false);
        return;
      }

      // Warn if there are active sessions
      if (activeSessions.length > 0) {
        setPendingProject(project);
        setShowWarning(true);
        return;
      }

      onSwitch(project);
      setOpen(false);
    },
    [activeProject, activeSessions.length, onSwitch]
  );

  const confirmSwitch = useCallback(() => {
    if (pendingProject) {
      onSwitch(pendingProject);
      setOpen(false);
      setShowWarning(false);
      setPendingProject(null);
    }
  }, [pendingProject, onSwitch]);

  if (!activeProject) return null;

  return (
    <Box ref={containerRef} position="relative">
      {/* Trigger button */}
      <chakra.button
        onClick={() => setOpen(!open)}
        display="flex"
        alignItems="center"
        gap="2"
        p="1 2.5"
        bg="transparent"
        border="1px solid transparent"
        borderRadius="md"
        cursor="pointer"
        color="text.primary"
        fontFamily="heading"
        fontSize="2xl"
        fontWeight={700}
        letterSpacing="-0.03em"
        lineHeight={1.2}
        outline="none"
        transition="all 150ms ease"
        {...triggerPress}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#1C2333';
          e.currentTarget.style.borderColor = '#1E2A3B';
        }}
        onMouseLeave={(e) => {
          triggerPress.onMouseLeave(e);
          e.currentTarget.style.backgroundColor = '';
          e.currentTarget.style.borderColor = '';
        }}
      >
        {activeProject.name}
        <Box
          as="span"
          display="inline-flex"
          transition="transform 200ms ease"
          transform={open ? 'rotate(180deg)' : 'rotate(0)'}
        >
          <ChevronDown size={16} color="#8B99B3" />
        </Box>
      </chakra.button>

      {/* Dropdown */}
      {open && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          mt="1"
          minW="320px"
          maxH="400px"
          overflowY="auto"
          bg="bg.elevated"
          border="1px solid"
          borderColor="border.default"
          borderRadius="lg"
          boxShadow="lg"
          zIndex={1000}
          p="1"
        >
          {/* Warning banner */}
          {showWarning && pendingProject && (
            <Flex
              direction="column"
              gap="2"
              p="3"
              m="1"
              bg="semantic.warning.bg"
              border="1px solid"
              borderColor="semantic.warning.border"
              borderRadius="md"
            >
              <Flex
                align="center"
                gap="2"
                fontSize="sm"
                fontWeight={600}
                color="semantic.warning"
              >
                <AlertTriangle size={14} />
                {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''} running
              </Flex>
              <Text
                fontSize="xs"
                color="accent.amber.200"
                lineHeight={1.4}
              >
                Sessions will continue running in the background. Switch to{' '}
                <strong>{pendingProject.name}</strong>?
              </Text>
              <Flex gap="6px" justify="flex-end">
                <chakra.button
                  onClick={() => {
                    setShowWarning(false);
                    setPendingProject(null);
                  }}
                  p="1 3"
                  bg="transparent"
                  border="1px solid"
                  borderColor="semantic.warning.border"
                  borderRadius="6px"
                  color="accent.amber.200"
                  fontSize="xs"
                  fontWeight={500}
                  cursor="pointer"
                  fontFamily="body"
                >
                  Cancel
                </chakra.button>
                <chakra.button
                  onClick={confirmSwitch}
                  p="1 3"
                  bg="semantic.warning.border"
                  border="none"
                  borderRadius="6px"
                  color="bg.canvas"
                  fontSize="xs"
                  fontWeight={600}
                  cursor="pointer"
                  fontFamily="body"
                >
                  Switch anyway
                </chakra.button>
              </Flex>
            </Flex>
          )}

          {/* Project list */}
          {projects.map((project) => {
            const isActive = project.path === activeProject.path;
            return (
              <ProjectListItem
                key={project.path}
                project={project}
                isActive={isActive}
                onSelect={handleSelect}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

/** Extracted to keep the map callback clean and allow hook usage */
function ProjectListItem({
  project,
  isActive,
  onSelect,
}: {
  project: ActiveProject;
  isActive: boolean;
  onSelect: (p: ActiveProject) => void;
}) {
  const pressHandlers = useButtonPress();

  return (
    <chakra.button
      onClick={() => onSelect(project)}
      display="flex"
      alignItems="center"
      gap="10px"
      p="10px 12px"
      w="100%"
      bg={isActive ? 'rgba(28, 35, 51, 0.4)' : 'transparent'}
      border="none"
      borderRadius="md"
      cursor="pointer"
      textAlign="left"
      outline="none"
      transition="background-color 100ms ease"
      fontFamily="body"
      {...pressHandlers}
      onMouseEnter={(e) => {
        if (!isActive) e.currentTarget.style.backgroundColor = '#1C2333';
      }}
      onMouseLeave={(e) => {
        pressHandlers.onMouseLeave(e);
        if (!isActive) e.currentTarget.style.backgroundColor = '';
      }}
    >
      <FolderOpen size={16} color={isActive ? '#8B5CF6' : '#4E5C72'} />
      <Box flex={1} minW={0}>
        <Text
          fontSize="base"
          fontWeight={isActive ? 600 : 500}
          color={isActive ? 'text.primary' : 'text.secondary'}
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {project.name}
        </Text>
        <Text
          fontSize="xs"
          color="text.muted"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          fontFamily="mono"
        >
          {project.path}
        </Text>
      </Box>
      {isActive && <Check size={14} color="#22C55E" />}
    </chakra.button>
  );
}
