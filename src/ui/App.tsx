import { useCallback, useEffect, useState } from 'react';
import { ChakraProvider, Flex } from '@chakra-ui/react';
import { system } from './theme';
import { Dashboard } from './components/layout/Dashboard';
import { ProjectPicker } from './components/layout/ProjectPicker';
import { useWebSocket } from './hooks/useWebSocket';
import { useDashboardStore, type ActiveProject } from './stores/dashboardStore';

export function App() {
  const ws = useWebSocket();
  const {
    activeProject,
    setActiveProject,
    projectLoading,
    setProjectLoading,
  } = useDashboardStore();

  const [projects, setProjects] = useState<ActiveProject[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  // Fetch project list on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const projectList: ActiveProject[] = data.projects || [];
        setProjects(projectList);

        // If the server already has an active project (started with a path arg),
        // set it as the active project
        if (data.activeProject) {
          const active = projectList.find(
            (p: ActiveProject) => p.path === data.activeProject
          );
          if (active) {
            setActiveProject(active);
          }
        }
      } catch (err) {
        console.error('[App] Failed to fetch projects:', err);
      } finally {
        setProjectLoading(false);
        setInitialLoad(false);
      }
    };

    fetchProjects();
  }, [setActiveProject, setProjectLoading]);

  // Handle project selection from picker
  const handleSelectProject = useCallback(
    async (project: ActiveProject) => {
      setProjectLoading(true);
      try {
        const res = await fetch('/api/projects/switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: project.path }),
        });
        if (!res.ok) {
          const err = await res.json();
          console.error('[App] Switch failed:', err.error);
          setProjectLoading(false);
          return;
        }
        const data = await res.json();
        setActiveProject(data.project);

        // Refresh project list
        const listRes = await fetch('/api/projects');
        if (listRes.ok) {
          const listData = await listRes.json();
          setProjects(listData.projects || []);
        }
      } catch (err) {
        console.error('[App] Failed to switch project:', err);
      } finally {
        setProjectLoading(false);
      }
    },
    [setActiveProject, setProjectLoading]
  );

  // Show nothing during initial load
  if (initialLoad) {
    return (
      <ChakraProvider value={system}>
        <Flex
          align="center"
          justify="center"
          h="100vh"
          w="100vw"
          bg="bg.canvas"
          color="text.secondary"
          fontFamily="body"
          fontSize="base"
        >
          Loading...
        </Flex>
      </ChakraProvider>
    );
  }

  // No active project -- show picker
  if (!activeProject) {
    return (
      <ChakraProvider value={system}>
        <ProjectPicker
          projects={projects}
          onSelect={handleSelectProject}
          loading={projectLoading}
        />
      </ChakraProvider>
    );
  }

  // Active project -- show dashboard
  return (
    <ChakraProvider value={system}>
      <Dashboard
        wsConnected={ws.connected}
        wsReconnecting={ws.reconnecting}
        wsSend={ws.send}
        wsSubscribe={ws.subscribe}
        wsUnsubscribe={ws.unsubscribe}
        wsAddListener={ws.addListener}
        projects={projects}
        onSwitchProject={handleSelectProject}
      />
    </ChakraProvider>
  );
}
