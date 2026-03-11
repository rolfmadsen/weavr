/**
 * Unit tests for the Event Model Layout Engine
 * 
 * Tests the core computeLayout function directly (imported from the worker module).
 * The worker wrapper is a thin shell; all logic lives in computeLayout.
 */

import { describe, it, expect } from 'vitest';
// Import the pure function directly from the algorithm module (no Worker globals)
import { computeLayout } from './eventModelLayout.algorithm';
import { NODE_WIDTH, MIN_NODE_HEIGHT, GRID_SIZE } from '../../../shared/constants';

const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

// Factory helpers
const makeNode = (overrides: Partial<{
    id: string; type: string; name: string; computedHeight: number;
    sliceId: string; actor: string; aggregate: string; service: string;
    pinned: boolean; x: number; y: number; width: number;
}> = {}) => ({
    id: overrides.id ?? 'node-1',
    type: overrides.type ?? 'COMMAND',
    name: overrides.name ?? 'Test Node',
    computedHeight: overrides.computedHeight ?? MIN_NODE_HEIGHT,
    sliceId: overrides.sliceId,
    actor: overrides.actor,
    aggregate: overrides.aggregate,
    service: overrides.service,
    pinned: overrides.pinned ?? false,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    width: overrides.width ?? NODE_WIDTH,
});

const makeLink = (id: string, source: string, target: string) => ({
    id, source, target,
});

const makeSlice = (id: string, nodeIds: string[], order = 0, chapter?: string) => ({
    id, nodeIds, order, chapter,
});

describe('Event Model Layout Engine', () => {

    describe('Empty Model', () => {
        it('should return empty results for zero nodes', () => {
            const result = computeLayout([], [], []);
            expect(result.positions).toEqual({});
            expect(result.edgeRoutes).toEqual({});
            expect(result.containerBounds).toEqual({});
        });
    });

    describe('Single Node', () => {
        it('should position a single node in a slice', () => {
            const node = makeNode({ id: 'n1', type: 'COMMAND', sliceId: 's1' });
            const slice = makeSlice('s1', ['n1'], 0);
            const result = computeLayout([node], [], [slice]);

            expect(result.positions).toHaveProperty('n1');
            const pos = result.positions['n1'];
            // Should be grid-snapped
            expect(pos.x % GRID_SIZE).toBe(0);
            expect(pos.y % GRID_SIZE).toBe(0);
        });

        it('should create container bounds for the slice', () => {
            const node = makeNode({ id: 'n1', type: 'COMMAND', sliceId: 's1' });
            const slice = makeSlice('s1', ['n1'], 0);
            const result = computeLayout([node], [], [slice]);

            expect(result.containerBounds).toHaveProperty('s1');
            const bounds = result.containerBounds['s1'];
            expect(bounds.width).toBeGreaterThan(0);
            expect(bounds.height).toBeGreaterThan(0);
        });
    });

    describe('Lane Ordering', () => {
        it('should place SCREEN above COMMAND', () => {
            const screen = makeNode({ id: 'screen', type: 'SCREEN', sliceId: 's1' });
            const command = makeNode({ id: 'cmd', type: 'COMMAND', sliceId: 's1' });
            const slice = makeSlice('s1', ['screen', 'cmd'], 0);

            const result = computeLayout([screen, command], [], [slice]);

            expect(result.positions['screen'].y).toBeLessThan(result.positions['cmd'].y);
        });

        it('should place COMMAND above DOMAIN_EVENT', () => {
            const command = makeNode({ id: 'cmd', type: 'COMMAND', sliceId: 's1' });
            const event = makeNode({ id: 'evt', type: 'DOMAIN_EVENT', sliceId: 's1' });
            const slice = makeSlice('s1', ['cmd', 'evt'], 0);

            const result = computeLayout([command, event], [], [slice]);

            expect(result.positions['cmd'].y).toBeLessThan(result.positions['evt'].y);
        });

        it('should place READ_MODEL above DOMAIN_EVENT', () => {
            const rm = makeNode({ id: 'rm', type: 'READ_MODEL', sliceId: 's1' });
            const event = makeNode({ id: 'evt', type: 'DOMAIN_EVENT', sliceId: 's1' });
            const slice = makeSlice('s1', ['rm', 'evt'], 0);

            const result = computeLayout([rm, event], [], [slice]);

            expect(result.positions['rm'].y).toBeLessThan(result.positions['evt'].y);
        });

        it('should maintain full lane order: SCREEN > AUTOMATION > COMMAND/READ_MODEL > DOMAIN_EVENT > INTEGRATION_EVENT', () => {
            const nodes = [
                makeNode({ id: 'screen', type: 'SCREEN', sliceId: 's1' }),
                makeNode({ id: 'auto', type: 'AUTOMATION', sliceId: 's1' }),
                makeNode({ id: 'cmd', type: 'COMMAND', sliceId: 's1' }),
                makeNode({ id: 'rm', type: 'READ_MODEL', sliceId: 's1' }),
                makeNode({ id: 'de', type: 'DOMAIN_EVENT', sliceId: 's1' }),
                makeNode({ id: 'ie', type: 'INTEGRATION_EVENT', sliceId: 's1' }),
            ];
            const slice = makeSlice('s1', nodes.map(n => n.id), 0);

            const result = computeLayout(nodes, [], [slice]);

            const p = result.positions;
            // Strict ordering between different type lanes
            expect(p['screen'].y).toBeLessThan(p['auto'].y);
            expect(p['auto'].y).toBeLessThan(p['cmd'].y);
            // COMMAND and READ_MODEL share the same interaction lane (same Y)
            expect(p['cmd'].y).toBe(p['rm'].y);
            expect(p['cmd'].y).toBeLessThan(p['de'].y);
            expect(p['de'].y).toBeLessThan(p['ie'].y);
        });
    });

    describe('Actor Sub-Lanes', () => {
        it('should place screens with different actors in different Y positions', () => {
            const screenA = makeNode({ id: 's-a', type: 'SCREEN', sliceId: 's1', actor: 'Admin' });
            const screenB = makeNode({ id: 's-b', type: 'SCREEN', sliceId: 's1', actor: 'Customer' });
            const slice = makeSlice('s1', ['s-a', 's-b'], 0);

            const result = computeLayout([screenA, screenB], [], [slice]);

            // Different actors = different sub-lanes = different Y
            expect(result.positions['s-a'].y).not.toBe(result.positions['s-b'].y);
        });
    });

    describe('Aggregate Sub-Lanes', () => {
        it('should place domain events with different aggregates in different Y positions', () => {
            const eventA = makeNode({ id: 'e-a', type: 'DOMAIN_EVENT', sliceId: 's1', aggregate: 'Order' });
            const eventB = makeNode({ id: 'e-b', type: 'DOMAIN_EVENT', sliceId: 's1', aggregate: 'Customer' });
            const slice = makeSlice('s1', ['e-a', 'e-b'], 0);

            const result = computeLayout([eventA, eventB], [], [slice]);

            // Different aggregates = different sub-lanes = different Y
            expect(result.positions['e-a'].y).not.toBe(result.positions['e-b'].y);
        });
    });

    describe('Timeline Composition', () => {
        it('should place slices left-to-right by order', () => {
            const n1 = makeNode({ id: 'n1', type: 'COMMAND', sliceId: 's1' });
            const n2 = makeNode({ id: 'n2', type: 'COMMAND', sliceId: 's2' });
            const slices = [
                makeSlice('s1', ['n1'], 0),
                makeSlice('s2', ['n2'], 1),
            ];

            const result = computeLayout([n1, n2], [], slices);

            expect(result.positions['n1'].x).toBeLessThan(result.positions['n2'].x);
        });

        it('should group slices by chapter', () => {
            const n1 = makeNode({ id: 'n1', type: 'COMMAND', sliceId: 's1' });
            const n2 = makeNode({ id: 'n2', type: 'COMMAND', sliceId: 's2' });
            const n3 = makeNode({ id: 'n3', type: 'COMMAND', sliceId: 's3' });
            const slices = [
                makeSlice('s1', ['n1'], 0, 'Chapter A'),
                makeSlice('s2', ['n2'], 1, 'Chapter A'),
                makeSlice('s3', ['n3'], 2, 'Chapter B'),
            ];

            const result = computeLayout([n1, n2, n3], [], slices);

            // s3 should be further from s2 than s2 is from s1 (chapter gap > slice gap)
            const gap12 = result.positions['n2'].x - result.positions['n1'].x;
            const gap23 = result.positions['n3'].x - result.positions['n2'].x;
            expect(gap23).toBeGreaterThan(gap12);
        });
    });

    describe('Cross-Slice Alignment', () => {
        it('should align same-type elements at the same Y across slices', () => {
            const n1 = makeNode({ id: 'n1', type: 'COMMAND', sliceId: 's1' });
            const n2 = makeNode({ id: 'n2', type: 'COMMAND', sliceId: 's2' });
            const slices = [
                makeSlice('s1', ['n1'], 0),
                makeSlice('s2', ['n2'], 1),
            ];

            const result = computeLayout([n1, n2], [], slices);

            // Same type in different slices should have identical Y
            expect(result.positions['n1'].y).toBe(result.positions['n2'].y);
        });
    });

    describe('Edge Routing', () => {
        it('should route intra-slice edges vertically', () => {
            const screen = makeNode({ id: 'screen', type: 'SCREEN', sliceId: 's1' });
            const cmd = makeNode({ id: 'cmd', type: 'COMMAND', sliceId: 's1' });
            const link = makeLink('l1', 'screen', 'cmd');
            const slice = makeSlice('s1', ['screen', 'cmd'], 0);

            const result = computeLayout([screen, cmd], [link], [slice]);

            expect(result.edgeRoutes).toHaveProperty('l1');
            const route = result.edgeRoutes['l1'];
            expect(route.length).toBeGreaterThanOrEqual(4);
            // All coordinates should be grid-snapped
            route.forEach(coord => {
                expect(coord % GRID_SIZE).toBe(0);
            });
        });

        it('should route cross-slice edges horizontally', () => {
            const rm = makeNode({ id: 'rm', type: 'READ_MODEL', sliceId: 's1' });
            const screen = makeNode({ id: 'screen', type: 'SCREEN', sliceId: 's2' });
            const link = makeLink('l1', 'rm', 'screen');
            const slices = [
                makeSlice('s1', ['rm'], 0),
                makeSlice('s2', ['screen'], 1),
            ];

            const result = computeLayout([rm, screen], [link], slices);

            expect(result.edgeRoutes).toHaveProperty('l1');
        });
    });

    describe('Pinned Nodes', () => {
        it('should preserve pinned node position', () => {
            const pinned = makeNode({
                id: 'pinned', type: 'COMMAND', sliceId: 's1',
                pinned: true, x: 500, y: 300,
            });
            const slice = makeSlice('s1', ['pinned'], 0);

            const result = computeLayout([pinned], [], [slice]);

            expect(result.positions['pinned'].x).toBe(snap(500));
            expect(result.positions['pinned'].y).toBe(snap(300));
        });
    });

    describe('Default Slice', () => {
        it('should handle nodes without a sliceId', () => {
            const node = makeNode({ id: 'orphan', type: 'COMMAND' });
            const result = computeLayout([node], [], []);

            expect(result.positions).toHaveProperty('orphan');
        });
    });

    describe('Grid Snapping', () => {
        it('should snap all positions to GRID_SIZE', () => {
            const nodes = [
                makeNode({ id: 'n1', type: 'SCREEN', sliceId: 's1' }),
                makeNode({ id: 'n2', type: 'COMMAND', sliceId: 's1' }),
                makeNode({ id: 'n3', type: 'DOMAIN_EVENT', sliceId: 's1' }),
            ];
            const slice = makeSlice('s1', nodes.map(n => n.id), 0);

            const result = computeLayout(nodes, [], [slice]);

            Object.values(result.positions).forEach(pos => {
                expect(pos.x % GRID_SIZE).toBe(0);
                expect(pos.y % GRID_SIZE).toBe(0);
            });

            Object.values(result.containerBounds).forEach(bounds => {
                expect(bounds.x % GRID_SIZE).toBe(0);
                expect(bounds.y % GRID_SIZE).toBe(0);
                expect(bounds.width % GRID_SIZE).toBe(0);
                expect(bounds.height % GRID_SIZE).toBe(0);
            });
        });
    });

    describe('Multiple Nodes in Same Lane', () => {
        it('should space multiple commands horizontally within a slice', () => {
            const n1 = makeNode({ id: 'c1', type: 'COMMAND', sliceId: 's1' });
            const n2 = makeNode({ id: 'c2', type: 'COMMAND', sliceId: 's1' });
            const slice = makeSlice('s1', ['c1', 'c2'], 0);

            const result = computeLayout([n1, n2], [], [slice]);

            // Same Y (same lane), different X
            expect(result.positions['c1'].y).toBe(result.positions['c2'].y);
            expect(result.positions['c1'].x).not.toBe(result.positions['c2'].x);
        });
    });
});
