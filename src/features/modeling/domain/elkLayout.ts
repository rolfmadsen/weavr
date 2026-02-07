import type { LayoutOptions } from 'elkjs';
export type { LayoutOptions };
import { Node, Link, Slice, ElementType } from './types';
import { NODE_WIDTH } from '../../../shared/constants.ts';
import { calculateNodeHeight } from './textUtils.ts';

// Singleton worker instance
let layoutWorker: Worker | null = null;
let currentRequestId = 0;

const getWorker = () => {
    if (!layoutWorker) {
        layoutWorker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
    }
    return layoutWorker;
};

export interface LayoutResult {
    positions: Map<string, { x: number; y: number }>;
    edgeRoutes: Map<string, number[]>;
    containerBounds?: Map<string, { x: number; y: number; width: number; height: number }>;
}

const getPartitionKey = (node: Node) => {
    // 1. Screens and Automations are partitioned by Actor (Swimlanes)
    if (node.type === 'SCREEN' || node.type === ElementType.Automation) return node.actor || '';

    // 2. Commands and Read Models are ALWAYS in the shared "Interaction" layer (No partitioning)
    if (node.type === 'COMMAND' || node.type === ElementType.ReadModel) return '';

    // 3. Events are partitioned by Service/Context (Bounded Contexts)
    return node.service || '';
};

export const calculateElkLayout = async (
    nodes: Node[],
    links: Link[],
    slices: Slice[] = [],
    options: LayoutOptions = {}
): Promise<LayoutResult> => {

    return new Promise((resolve, reject) => {
        const requestId = ++currentRequestId;

        // 1. Prepare Nodes with Dimensions
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
            layoutOptions: {
                // @ts-ignore - dynamic properties
                'partitionKey': getPartitionKey(node)
            }
        }));

        // 2. Prepare Edges
        const workerLinks = links.map(link => ({
            id: link.id,
            source: link.source,
            target: link.target
        }));

        // 3. Get Worker Instance
        const worker = getWorker();

        // 4. Handle Worker Messages
        const handleMessage = (event: MessageEvent) => {
            const { type, positions, edgeRoutes, containerBounds, message, requestId: respId } = event.data;

            // Only process if this is the response for our current request
            if (respId !== requestId) return;

            // Clean up listener
            worker.removeEventListener('message', handleMessage);

            if (type === 'SUCCESS') {
                const positionMap = new Map<string, { x: number; y: number }>();
                Object.entries(positions as Record<string, { x: number, y: number }>).forEach(([id, pos]) => {
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
                    Object.entries(containerBounds as Record<string, { x: number, y: number, width: number; height: number }>).forEach(([id, bounds]) => {
                        containerBoundsMap.set(id, bounds);
                    });
                }

                resolve({ positions: positionMap, edgeRoutes: edgeRoutesMap, containerBounds: containerBoundsMap });
            } else if (type === 'ERROR') {
                console.error("ELK Worker Error:", message);
                reject(new Error(message));
            }
        };

        worker.addEventListener('message', handleMessage);

        // 5. Send Data to Worker
        worker.postMessage({
            requestId,
            nodes: workerNodes,
            links: workerLinks,
            slices: slices.map(s => ({
                id: s.id,
                nodeIds: Array.from(s.nodeIds),
                order: s.order,
                chapter: s.chapter
            })),
            //direction: 'DOWN',
            globalOptions: options
        });
    });
};