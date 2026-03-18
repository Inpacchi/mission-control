import { useState } from 'react';
import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { Rocket, FolderOpen, Clock, ChevronRight } from 'lucide-react';
import { useButtonPress } from '../../hooks/useButtonPress';
import type { ActiveProject } from '../../stores/dashboardStore';

interface ProjectPickerProps {
  projects: ActiveProject[];
  onSelect: (project: ActiveProject) => void;
  loading: boolean;
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function MarkerBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <Text
      as="span"
      display="inline-flex"
      alignItems="center"
      gap="1"
      p="2px 8px"
      borderRadius="full"
      fontSize="xs"
      fontWeight={500}
      bg={active ? 'semantic.info.bg' : 'bg.surface'}
      color={active ? 'text.accent' : 'text.muted'}
      border="1px solid"
      borderColor={active ? 'rgba(47,116,208,0.2)' : 'border.subtle'}
      transition="all 150ms ease"
    >
      {label}
    </Text>
  );
}

export function ProjectPicker({ projects, onSelect, loading }: ProjectPickerProps) {
  const [pathInput, setPathInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenPath = async () => {
    if (!pathInput.trim()) return;
    setInputError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInputError(data.error || 'Failed to open project');
        setSubmitting(false);
        return;
      }
      onSelect(data.project);
    } catch {
      setInputError('Failed to connect to server');
      setSubmitting(false);
    }
  };

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      h="100vh"
      w="100vw"
      bg="bg.canvas"
      fontFamily="body"
      overflow="auto"
    >
      {/* Logo + Title */}
      <Flex
        direction="column"
        align="center"
        mb="10"
      >
        <Flex
          align="center"
          gap="3"
          mb="2"
        >
          <Rocket size={32} color="#8B5CF6" />
          <Text
            as="h1"
            fontSize="3xl"
            fontWeight={700}
            letterSpacing="-0.03em"
            color="text.primary"
          >
            Mission Control
          </Text>
        </Flex>
        <Text
          fontSize="base"
          color="text.secondary"
        >
          Select a project to get started
        </Text>
      </Flex>

      {/* Project list */}
      <Flex
        direction="column"
        gap="3"
        w="100%"
        maxW="560px"
        px="6"
      >
        {loading && (
          <Text
            textAlign="center"
            color="text.secondary"
            fontSize="base"
            py="8"
          >
            Loading projects...
          </Text>
        )}

        {!loading && projects.length === 0 && !showInput && (
          <Text
            textAlign="center"
            color="text.muted"
            fontSize="base"
            py="8"
          >
            No projects registered yet. Open a directory to get started.
          </Text>
        )}

        {!loading &&
          projects.map((project) => (
            <ProjectCard
              key={project.path}
              project={project}
              onSelect={onSelect}
            />
          ))}

        {/* Open directory button / input */}
        {!showInput ? (
          <OpenDirectoryButton onShow={() => setShowInput(true)} />
        ) : (
          <PathInputPanel
            pathInput={pathInput}
            setPathInput={setPathInput}
            inputError={inputError}
            setInputError={setInputError}
            submitting={submitting}
            onSubmit={handleOpenPath}
            onCancel={() => {
              setShowInput(false);
              setPathInput('');
              setInputError(null);
            }}
          />
        )}
      </Flex>

      {/* Footer */}
      <Text
        position="absolute"
        bottom="6"
        color="text.muted"
        fontSize="xs"
      >
        Mission Control v0.1.0
      </Text>
    </Flex>
  );
}

/** Individual project card -- extracted to allow hook usage */
function ProjectCard({
  project,
  onSelect,
}: {
  project: ActiveProject;
  onSelect: (p: ActiveProject) => void;
}) {
  const pressHandlers = useButtonPress();

  return (
    <chakra.button
      onClick={() => onSelect(project)}
      display="flex"
      alignItems="center"
      gap="4"
      p="4 5"
      bg="bg.elevated"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="xl"
      cursor="pointer"
      textAlign="left"
      transition="all 200ms cubic-bezier(0.4, 0, 0.2, 1)"
      w="100%"
      outline="none"
      {...pressHandlers}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.backgroundColor = '#2A3750';
        el.style.borderColor = '#3D5070';
        el.style.transform = 'translateY(-1px)';
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.5)';
      }}
      onMouseLeave={(e) => {
        pressHandlers.onMouseLeave(e);
        const el = e.currentTarget;
        el.style.backgroundColor = '';
        el.style.borderColor = '';
        el.style.transform = '';
        el.style.boxShadow = '';
      }}
    >
      {/* Icon */}
      <Flex
        w="40px"
        h="40px"
        borderRadius="lg"
        bg="bg.surface"
        align="center"
        justify="center"
        flexShrink={0}
      >
        <FolderOpen size={20} color="#8B5CF6" />
      </Flex>

      {/* Info */}
      <Box flex={1} minW={0}>
        <Text
          fontSize="md"
          fontWeight={600}
          color="text.primary"
          mb="1"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {project.name}
        </Text>
        <Text
          fontSize="xs"
          color="text.muted"
          mb="6px"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
          fontFamily="mono"
        >
          {project.path}
        </Text>
        <Flex gap="6px" flexWrap="wrap" align="center">
          <MarkerBadge label="CLAUDE.md" active={project.hasClaudeMd} />
          <MarkerBadge label="_index.md" active={project.hasIndex} />
          <MarkerBadge label=".claude/" active={project.hasClaude} />
          <MarkerBadge label=".mc.json" active={project.hasMcConfig} />
        </Flex>
      </Box>

      {/* Right: last opened + chevron */}
      <Flex
        direction="column"
        align="flex-end"
        gap="1"
        flexShrink={0}
      >
        <Flex
          align="center"
          gap="1"
          fontSize="xs"
          color="text.muted"
        >
          <Clock size={12} />
          {formatRelativeTime(project.lastOpened)}
        </Flex>
        <ChevronRight size={16} color="#4E5C72" />
      </Flex>
    </chakra.button>
  );
}

/** Open directory button */
function OpenDirectoryButton({ onShow }: { onShow: () => void }) {
  const pressHandlers = useButtonPress();

  return (
    <chakra.button
      onClick={onShow}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap="2"
      p="14px 20px"
      bg="transparent"
      border="1px solid"
      borderColor="border.default"
      borderRadius="xl"
      cursor="pointer"
      color="text.secondary"
      fontSize="base"
      fontWeight={500}
      fontFamily="body"
      transition="all 200ms ease"
      w="100%"
      outline="none"
      {...pressHandlers}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#3D5070';
        e.currentTarget.style.color = '#E8EDF4';
        e.currentTarget.style.backgroundColor = 'rgba(28,35,51,0.13)';
      }}
      onMouseLeave={(e) => {
        pressHandlers.onMouseLeave(e);
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.color = '';
        e.currentTarget.style.backgroundColor = '';
      }}
    >
      <FolderOpen size={16} />
      Open a project directory
    </chakra.button>
  );
}

/** Path input panel for opening a project by path */
function PathInputPanel({
  pathInput,
  setPathInput,
  inputError,
  setInputError,
  submitting,
  onSubmit,
  onCancel,
}: {
  pathInput: string;
  setPathInput: (v: string) => void;
  inputError: string | null;
  setInputError: (v: string | null) => void;
  submitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const submitPress = useButtonPress();

  return (
    <Flex
      direction="column"
      gap="2"
      p="4 5"
      bg="bg.elevated"
      border="1px solid"
      borderColor="border.subtle"
      borderRadius="xl"
    >
      <Text
        as="label"
        fontSize="sm"
        fontWeight={500}
        color="text.secondary"
      >
        Project path
      </Text>
      <Flex gap="2">
        <chakra.input
          type="text"
          value={pathInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setPathInput(e.target.value);
            setInputError(null);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') onSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder="/path/to/project"
          autoFocus
          flex={1}
          p="2 3"
          bg="bg.input"
          border="1px solid"
          borderColor={inputError ? 'semantic.error' : 'border.default'}
          borderRadius="md"
          color="text.primary"
          fontSize="base"
          fontFamily="mono"
          outline="none"
          transition="border-color 150ms ease"
          _focus={{ borderColor: inputError ? 'semantic.error' : 'border.accent' }}
        />
        <chakra.button
          onClick={onSubmit}
          disabled={submitting || !pathInput.trim()}
          p="2 4"
          bg={submitting ? 'accent.blue.700' : 'accent.blue.500'}
          border="none"
          borderRadius="md"
          color="text.primary"
          fontSize="base"
          fontWeight={600}
          cursor={submitting ? 'wait' : 'pointer'}
          fontFamily="body"
          transition="background-color 150ms ease"
          opacity={!pathInput.trim() ? 0.5 : 1}
          {...submitPress}
          onMouseEnter={(e) => {
            if (!submitting) e.currentTarget.style.backgroundColor = '#4D8FE8';
          }}
          onMouseLeave={(e) => {
            submitPress.onMouseLeave(e);
            if (!submitting) e.currentTarget.style.backgroundColor = '';
          }}
        >
          {submitting ? 'Opening...' : 'Open'}
        </chakra.button>
      </Flex>
      {inputError && (
        <Text
          fontSize="sm"
          color="semantic.error"
        >
          {inputError}
        </Text>
      )}
    </Flex>
  );
}
