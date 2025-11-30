import { Node, Link } from '../types';
import { NODE_WIDTH } from '../constants';
import { calculateNodeHeight } from '../utils/textUtils';

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
    options: any = {}
): Promise<Map<string, { x: number; y: number }>> => {

    return new Promise((resolve, reject) => {
        // 1. Prepare Nodes with Dimensions
        const workerNodes = nodes.map(node => ({
            id: node.id,
            width: NODE_WIDTH, // Fixed width
            computedHeight: calculateNodeHeight(node.name),
            // Pass type for potential partitioning logic in worker
            type: node.type
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
            const { type, positions, message } = event.data;

            // Clean up listener to avoid memory leaks
            worker.removeEventListener('message', handleMessage);

            if (type === 'SUCCESS') {
                const positionMap = new Map<string, { x: number; y: number }>();
                Object.entries(positions).forEach(([id, pos]: [string, any]) => {
                    positionMap.set(id, pos);
                });
                resolve(positionMap);
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
            slices: [], // We might want to pass slices if we use them for partitioning
            direction: 'DOWN',
            globalOptions: options
        });
    });
};