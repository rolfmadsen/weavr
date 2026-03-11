/**
 * Event Model Layout — Main Thread Entry Point
 * 
 * Drop-in replacement for elkLayout.ts.
 * Delegates computation to a Web Worker running the custom Event Model layout algorithm.
 */

import { Node, Link, Slice } from './types';
import { NODE_WIDTH } from '../../../shared/constants';
import { calculateNodeHeight } from './textUtils';

// Layout options (replaces elkjs LayoutOptions type)
export type LayoutOptions = Record<string, string>;

// Singleton worker instance
let layoutWorker: Worker | null = null;
let currentRequestId = 0;

const getWorker = () => {
    if (!layoutWorker) {
        layoutWorker = new Worker(
            new URL('./eventModel.layout.worker.ts', import.meta.url),
            { type: 'module' }
        );
    }
    return layoutWorker;
};

export interface LayoutResult {
    positions: Map<string, { x: number; y: number }>;
    edgeRoutes: Map<string, number[]>;
    containerBounds?: Map<string, { x: number; y: number; width: number; height: number }>;
}

export const calculateLayout = async (
    nodes: Node[],
    links: Link[],
    slices: Slice[] = [],
    _options: LayoutOptions = {}
): Promise<LayoutResult> => {
    return new Promise((resolve, reject) => {
        const requestId = ++currentRequestId;

        // 1. Prepare nodes with dimensions
        const workerNodes = nodes.map(node => ({
            id: node.id,
            width: NODE_WIDTH,
            computedHeight: calculateNodeHeight(node.name),
            type: String(node.type || ''),
            sliceId: node.sliceId,
            pinned: node.pinned,
            x: node.fx ?? node.x ?? 0,
            y: node.fy ?? node.y ?? 0,
            actor: node.actor,
            aggregate: node.aggregate,
            service: node.service,
        }));

        // 2. Prepare links
        const workerLinks = links.map(link => ({
            id: link.id,
            source: link.source,
            target: link.target,
        }));

        // 3. Get worker instance
        const worker = getWorker();

        // 4. Handle worker messages
        const handleMessage = (event: MessageEvent) => {
            const { type, positions, edgeRoutes, containerBounds, message, requestId: respId } = event.data;

            // Only process our request
            if (respId !== requestId) return;

            worker.removeEventListener('message', handleMessage);

            if (type === 'SUCCESS') {
                const positionMap = new Map<string, { x: number; y: number }>();
                Object.entries(positions as Record<string, { x: number; y: number }>).forEach(([id, pos]) => {
                    positionMap.set(id, pos);
                });

                const edgeRoutesMap = new Map<string, number[]>();
                if (edgeRoutes) {
                    Object.entries(edgeRoutes as Record<string, number[]>).forEach(([id, route]) => {
                        edgeRoutesMap.set(id, route);
                    });
                }

                const containerBoundsMap = new Map<string, { x: number; y: number; width: number; height: number }>();
                if (containerBounds) {
                    Object.entries(containerBounds as Record<string, { x: number; y: number; width: number; height: number }>).forEach(([id, bounds]) => {
                        containerBoundsMap.set(id, bounds);
                    });
                }

                resolve({
                    positions: positionMap,
                    edgeRoutes: edgeRoutesMap,
                    containerBounds: containerBoundsMap,
                });
            } else if (type === 'ERROR') {
                console.error('[EventModelLayout] Worker Error:', message);
                reject(new Error(message));
            }
        };

        worker.addEventListener('message', handleMessage);

        // 5. Send data to worker
        worker.postMessage({
            requestId,
            nodes: workerNodes,
            links: workerLinks,
            slices: slices.map(s => ({
                id: s.id,
                nodeIds: Array.from(s.nodeIds),
                order: s.order,
                chapter: s.chapter,
            })),
        });
    });
};
