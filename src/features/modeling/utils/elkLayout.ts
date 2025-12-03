import { Node, Link, Slice } from '../types';
import { NODE_WIDTH } from '../../../shared/constants';
import { calculateNodeHeight } from './textUtils';

// Singleton worker instance
let layoutWorker: Worker | null = null;

const getWorker = () => {
    if (!layoutWorker) {
        layoutWorker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
    }
    return layoutWorker;
};

export const calculateElkLayout = async (
    nodes: Node[],
    links: Link[],
    slices: Slice[] = [],
    options: any = {}
): Promise<{ positions: Map<string, { x: number; y: number }>, edgeRoutes: Map<string, number[]> }> => {

    return new Promise((resolve, reject) => {
        // 1. Prepare Nodes with Dimensions
        const workerNodes = nodes.map(node => ({
            id: node.id,
            width: NODE_WIDTH, // Fixed width
            computedHeight: calculateNodeHeight(node.name),
            // Pass type for potential partitioning logic in worker
            type: node.type,
            sliceId: node.sliceId
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
            const { type, positions, edgeRoutes, message } = event.data;

            // Clean up listener to avoid memory leaks
            worker.removeEventListener('message', handleMessage);

            if (type === 'SUCCESS') {
                const positionMap = new Map<string, { x: number; y: number }>();
                Object.entries(positions).forEach(([id, pos]: [string, any]) => {
                    positionMap.set(id, pos);
                });

                const edgeRoutesMap = new Map<string, number[]>();
                if (edgeRoutes) {
                    Object.entries(edgeRoutes).forEach(([id, route]: [string, any]) => {
                        edgeRoutesMap.set(id, route);
                    });
                }

                resolve({ positions: positionMap, edgeRoutes: edgeRoutesMap });
            } else if (type === 'ERROR') {
                console.error("ELK Worker Error:", message);
                reject(new Error(message));
            }
        };

        worker.addEventListener('message', handleMessage);

        // 5. Send Data to Worker
        worker.postMessage({
            nodes: workerNodes,
            links: workerLinks,
            slices: slices.map(s => ({
                id: s.id,
                nodeIds: Array.from(s.nodeIds), // Convert Set to Array
                order: s.order
            })),
            direction: 'DOWN', // Default internal direction
            globalOptions: options
        });
    });
};