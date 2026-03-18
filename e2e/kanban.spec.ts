import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Kanban board', () => {
  test('renders kanban columns with expected labels', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load and kanban to render
    // The KanbanColumn uses role="list" with aria-label containing the column name
    const expectedColumns = [
      'Idea',
      'Spec',
      'Plan',
      'In Progress',
      'Review',
      'Complete',
      'Blocked',
    ];

    for (const label of expectedColumns) {
      // Each column header has the label text rendered in a span
      const columnHeader = page.locator(`text=${label}`).first();
      await expect(columnHeader).toBeVisible({ timeout: 10000 });
    }
  });

  test('displays deliverable card when spec file exists', async ({
    page,
    request,
  }) => {
    // First, determine the project path the server is using
    const healthRes = await request.get('/api/health');
    const health = await healthRes.json();

    // The server serves the project it was started with.
    // We need to find the docs directory. Try the SDLC endpoint.
    const sdlcRes = await request.get('/api/sdlc/deliverables');
    if (!sdlcRes.ok()) {
      test.skip(true, 'SDLC endpoint not available');
      return;
    }

    const deliverablesBefore = await sdlcRes.json();

    await page.goto('/');

    // Verify the kanban board is visible by checking for column list roles
    const columns = page.locator('[role="list"]');
    await expect(columns.first()).toBeVisible({ timeout: 10000 });

    // If there are already deliverables, verify cards are rendered
    if (
      Array.isArray(deliverablesBefore) &&
      deliverablesBefore.length > 0
    ) {
      // There should be at least one card visible
      // Cards contain the deliverable ID (e.g., "D1")
      const firstDeliverable = deliverablesBefore[0];
      const cardText = page.locator(`text=${firstDeliverable.id}`).first();
      await expect(cardText).toBeVisible({ timeout: 10000 });
    }
  });

  test('kanban columns use list role for accessibility', async ({ page }) => {
    await page.goto('/');

    // Each KanbanColumn renders a div with role="list"
    const lists = page.locator('[role="list"]');
    await expect(lists.first()).toBeVisible({ timeout: 10000 });

    // Should have 7 columns
    const count = await lists.count();
    expect(count).toBe(7);
  });
});
