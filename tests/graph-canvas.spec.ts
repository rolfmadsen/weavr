import { test, expect, Page } from '@playwright/test';

test.describe('GraphCanvas', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');

        // Dismiss Welcome Modal if present
        const startButton = page.getByRole('button', { name: 'Start Modeling' });
        try {
            await startButton.waitFor({ state: 'visible', timeout: 3000 });
            await startButton.click();
            await expect(startButton).not.toBeVisible();
        } catch (e) {
            // Modal didn't appear, continue
        }

        // Wait for GunJS to be ready
        await expect(page.getByTitle(/Add Element/)).toBeVisible({ timeout: 15000 });

        // Wait for canvas
        await page.waitForSelector('canvas');

        // Wait for Konva stage to be exposed
        await page.waitForFunction(() => (window as any).WeavrKonva !== undefined);
    });

    async function waitForNodeCount(page: Page, count: number): Promise<void> {
        await page.waitForFunction((expectedCount) => {
            const stage = (window as any).WeavrKonva;
            if (!stage) return false;
            const nodes = stage.find((node: any) => node.getType() === 'Group' && node.id() && node.id().startsWith('node-'));
            return nodes.length === expectedCount;
        }, count, { timeout: 15000 });
    }



    test('should add and render nodes', async ({ page }) => {
        // Open Toolbar
        await page.getByTitle(/Add Element/).click();

        // Add a Screen node
        await page.getByTitle(/Add Screen/).click();

        // Verify node exists
        await waitForNodeCount(page, 1);

        // Re-open Toolbar (it closes after adding)
        await page.waitForTimeout(500);
        await page.getByTitle(/Add Element/).click();

        // Add a Command node
        await page.getByTitle(/Add Command/).click();
        await waitForNodeCount(page, 2);
    });

    test('should support dragging different node types', async ({ page }) => {
        // Wait for app to be ready
        await page.waitForFunction(() => (window as any).WeavrKonva !== undefined);

        // Helper to press keys
        const pressKey = async (key: string) => {
            await page.keyboard.press(key);
        };

        // Add Screen (Shortcut: 'a' then '1')
        await pressKey('a');
        await page.waitForTimeout(500);
        await pressKey('1');
        await waitForNodeCount(page, 1);

        // Add Command (Shortcut: 'a' then '2')
        await page.waitForTimeout(500);
        await pressKey('a');
        await page.waitForTimeout(500);
        await pressKey('2');
        await waitForNodeCount(page, 2);

        // Add Event (Shortcut: 'a' then '3')
        await page.waitForTimeout(500);
        await pressKey('a');
        await page.waitForTimeout(500);
        await pressKey('3');
        await waitForNodeCount(page, 3);

        // Get positions of all nodes
        const positions = await page.evaluate(() => {
            const stage = (window as any).WeavrKonva;
            if (!stage) return [];
            const nodes = stage.find((node: any) => node.getType() === 'Group' && node.id() && node.id().startsWith('node-'));
            return nodes.map((node: any) => {
                const transform = node.getAbsoluteTransform();
                return { id: node.id(), ...transform.point({ x: 0, y: 0 }) };
            });
        });

        expect(positions.length).toBe(3);

        // Drag each node
        for (const pos of positions) {
            // Move mouse to node center
            await page.mouse.move(pos.x, pos.y);
            await page.mouse.down();
            // Drag by 100px
            await page.mouse.move(pos.x + 100, pos.y + 100);
            await page.mouse.up();

            // Wait a bit for update
            await page.waitForTimeout(200);
        }

        // Verify new positions
        const newPositions = await page.evaluate(() => {
            const stage = (window as any).WeavrKonva;
            if (!stage) return [];
            const nodes = stage.find((node: any) => node.getType() === 'Group' && node.id() && node.id().startsWith('node-'));
            return nodes.map((node: any) => {
                const transform = node.getAbsoluteTransform();
                return { id: node.id(), ...transform.point({ x: 0, y: 0 }) };
            });
        });

        for (let i = 0; i < positions.length; i++) {
            const oldPos = positions[i];
            const newPos = newPositions.find((p: any) => p.id === oldPos.id);
            if (!newPos) throw new Error(`Node ${oldPos.id} not found after drag`);

            // Check if moved significantly
            expect(Math.abs(newPos.x - oldPos.x)).toBeGreaterThan(50);
            expect(Math.abs(newPos.y - oldPos.y)).toBeGreaterThan(50);
        }
    });

    test('visual regression', async ({ page }) => {
        // Setup a specific state for screenshot
        await page.getByTitle(/Add Element/).click();
        await page.getByTitle(/Add Screen/).click();

        await page.waitForTimeout(500);
        await page.getByTitle(/Add Element/).click();
        await page.getByTitle(/Add Command/).click();

        // Wait for animations/rendering to settle
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('graph-canvas-baseline.png');
    });
});
