import ELK from 'elkjs/lib/elk-api.js';
import type { ElkNode, ElkExtendedEdge, ElkPort } from 'elkjs';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

// Interfaces for data received from Main Thread
interface WorkerNode {
    id: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    computedHeight?: number; // Pre-calculated in main thread
}

interface WorkerLink {
    id: string;
    source: string;
    target: string;
}

interface WorkerSlice {
    id: string;
    nodeIds: string[]; // Received as Array, not Set
    order?: number;
}

const elk = new ELK({
    workerUrl: './elk-worker.min.js', // Placeholder, used by workerFactory
    workerFactory: (_url) => {
        // Vite will bundle this worker correctly using the URL constructor
        return new Worker(new URL('elkjs/lib/elk-worker.min.js', import.meta.url), { type: 'module' });
    }
});

self.onmessage = async (e: MessageEvent) => {
    console.log("ELK Worker received layout request", e.data);

    // Destructure with default direction
    const { nodes, links, slices, direction = 'DOWN' } = e.data as {
        nodes: WorkerNode[],
        links: WorkerLink[],
        slices: WorkerSlice[],
        direction?: string
    };

    try {
        // 1. Map for quick lookup
        const validNodeIds = new Set(nodes.map(n => n.id));

        // 2. Map Slice IDs to Partition Indices
        const sliceIndexMap = new Map<string, number>();
        // Ensure strictly controlled sort
        const sortedSlices = [...slices].sort((a, b) => (a.order || 0) - (b.order || 0));

        sortedSlices.forEach((slice, index) => {
            sliceIndexMap.set(slice.id, index + 1);
        });

        // 3. Helper: Create ELK Node
        const createElkNode = (node: WorkerNode): ElkNode => {
            const height = node.computedHeight || node.height || MIN_NODE_HEIGHT;
            const width = node.width || NODE_WIDTH;

            // Find slice: Check the array of nodeIds
            const parentSlice = slices.find(s => s.nodeIds.includes(node.id));
            const partitionIndex = parentSlice ? sliceIndexMap.get(parentSlice.id) : 0;

            return {
                id: node.id,
                width: width,
                height: height,
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': partitionIndex?.toString() || "0",
                    'elk.portConstraints': 'FIXED_SIDE'
                },
                ports: [
                    {
                        id: `${node.id}_in`,
                        width: 0, height: 0,
                        x: 0, y: height / 2,
                        layoutOptions: { 'elk.port.side': 'WEST' }
                    } as ElkPort,
                    {
                        id: `${node.id}_out`,
                        width: 0, height: 0,
                        x: NODE_WIDTH, y: height / 2,
                        layoutOptions: { 'elk.port.side': 'EAST' }
                    } as ElkPort
                ]
            };
        };

        // 4. Build ELK Children
        const elkChildren: ElkNode[] = [];
        nodes.forEach(node => {
            if (!node.id) return;
            elkChildren.push(createElkNode(node));
        });

        // 5. Build ELK Edges
        const elkEdges: ElkExtendedEdge[] = [];
        links.forEach(link => {
            // Filter dangling links
            if (!validNodeIds.has(link.source) || !validNodeIds.has(link.target)) return;
            elkEdges.push({
                id: link.id,
                sources: [link.source],
                targets: [link.target]
            });
        });

        // 6. Define Root Graph
        const rootGraph: ElkNode = {
            id: 'root',
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': direction,
                'org.eclipse.elk.partitioning.activate': 'true',
                'elk.spacing.nodeNode': '80',
                'elk.layered.spacing.nodeNodeBetweenLayers': '100',
                'elk.edgeRouting': 'ORTHOGONAL',
                'elk.layered.mergeEdges': 'true',
                'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',
                // This fixes the "Staircase" effect
                'elk.layered.nodePlacement.strategy': 'LINEAR_SEGMENTS'
            },
            children: elkChildren,
            edges: elkEdges
        };

        // 7. Execute Layout
        const layout = await elk.layout(rootGraph);

        // 8. Process Results
        const positions: Record<string, { x: number, y: number }> = {};

        const processNode = (node: ElkNode, parentX = 0, parentY = 0) => {
            let currentX = parentX + (node.x || 0);
            let currentY = parentY + (node.y || 0);

            if (validNodeIds.has(node.id)) {
                const GRID = 20;
                positions[node.id] = {
                    x: Math.round(currentX / GRID) * GRID,
                    y: Math.round(currentY / GRID) * GRID
                };
            }

            if (node.children) {
                node.children.forEach(child => processNode(child, currentX, currentY));
            }
        };

        if (layout) processNode(layout);

        // 9. Reply to Main Thread
        self.postMessage({ type: 'SUCCESS', positions });

    } catch (error) {
        self.postMessage({ type: 'ERROR', message: String(error) });
    }
};