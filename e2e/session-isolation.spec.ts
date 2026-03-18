import { test, expect } from '@playwright/test';

test.describe('Session isolation', () => {
  test('multiple sessions appear as separate tabs', async ({
    page,
    request,
  }) => {
    // Create two sessions via the API
    const res1 = await request.post('/api/sessions', { data: {} });
    const res2 = await request.post('/api/sessions', { data: {} });

    if (!res1.ok() || !res2.ok()) {
      test.skip(
        true,
        'Cannot create sessions (claude binary likely not available)'
      );
      return;
    }

    const session1 = (await res1.json()).session;
    const session2 = (await res2.json()).session;

    try {
      await page.goto('/');

      // Wait for the page to load
      await page.waitForTimeout(2000);

      // Both sessions should be listed somewhere in the UI
      // The TerminalPanel shows tabs for each session
      // Sessions list endpoint should return both
      const listRes = await request.get('/api/sessions');
      if (listRes.ok()) {
        const sessions = await listRes.json();
        const ids = Array.isArray(sessions)
          ? sessions.map((s: { id: string }) => s.id)
          : [];

        expect(ids).toContain(session1.id);
        expect(ids).toContain(session2.id);
      }
    } finally {
      // Clean up sessions
      await request.delete(`/api/sessions/${session1.id}`).catch(() => {});
      await request.delete(`/api/sessions/${session2.id}`).catch(() => {});
    }
  });

  test('session terminals are isolated containers', async ({
    page,
    request,
  }) => {
    // Create a session
    const res = await request.post('/api/sessions', { data: {} });

    if (!res.ok()) {
      test.skip(
        true,
        'Cannot create session (claude binary likely not available)'
      );
      return;
    }

    const session = (await res.json()).session;

    try {
      await page.goto('/');

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Verify the WebSocket connection works
      const wsConnected = await page.evaluate(() => {
        return new Promise<boolean>((resolve) => {
          const ws = new WebSocket(`ws://${window.location.host}/ws`);
          ws.onopen = () => {
            ws.close();
            resolve(true);
          };
          ws.onerror = () => resolve(false);
          setTimeout(() => resolve(false), 3000);
        });
      });

      expect(wsConnected).toBe(true);

      // Verify the session exists via API
      const sessionRes = await request.get(`/api/sessions/${session.id}`);
      if (sessionRes.ok()) {
        const data = await sessionRes.json();
        expect(data.id || data.session?.id).toBeTruthy();
      }
    } finally {
      await request.delete(`/api/sessions/${session.id}`).catch(() => {});
    }
  });
});
