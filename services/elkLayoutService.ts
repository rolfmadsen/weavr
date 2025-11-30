import { Node, Link } from '../types';
import { NODE_WIDTH } from '../constants';
import { calculateNodeHeight } from '../utils/textUtils';

export const calculateElkLayout = async (
    nodes: Node[],
    links: Link[]
): Promise<Map<string, { x: number; y: number }>> => {

    return new Promise((resolve, reject) => {
        // 1. Prepare Nodes with Dimensions
        const workerNodes = nodes.map(node => ({
            id: node.id,
            width: NODE_WIDTH, // Fixed width
            computedHeight: calculateNodeHeight(node.name)
        }));

        // 2. Prepare Edges
        const workerLinks = links.map(link => ({
            id: link.id,
            source: link.source,
            target: link.target
        }));

        // 3. Initialize Worker
        const worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });

        // 4. Handle Worker Messages
        worker.onmessage = (event: MessageEvent) => {
            const { type, positions, message } = event.data;

            if (type === 'SUCCESS') {
                const positionMap = new Map<string, { x: number; y: number }>();
                Object.entries(positions).forEach(([id, pos]: [string, any]) => {
                    positionMap.set(id, pos);
                });
                resolve(positionMap);
            } else if (type === 'ERROR') {
                console.error("ELK Worker Error:", message);
                reject(new Error(message));
                worker.terminate();
            }
        };

        worker.onerror = (error: ErrorEvent) => {
            const errorMessage = error ? (error.message || String(error)) : 'Unknown worker error';
            const errorFilename = error ? error.filename : 'N/A';
            console.error("ELK Worker Script Error:", error);
            reject(new Error(`Worker error: ${errorMessage} in ${errorFilename}`));
            worker.terminate();
        };

        // 5. Send Data to Worker
        // We are not passing slices for now as per previous logic
        worker.postMessage({
            nodes: workerNodes,
            links: workerLinks,
            slices: [],
            direction: 'DOWN'
        });
    });
};