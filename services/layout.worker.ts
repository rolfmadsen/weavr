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
    type?: string; // For potential partitioning
    layoutOptions?: any;
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
    // console.log("ELK Worker received layout request", e.data);

    // Destructure with default direction
    const { nodes, links, slices, direction = 'DOWN', globalOptions = {} } = e.data as {
        nodes: WorkerNode[],
        links: WorkerLink[],
        slices: WorkerSlice[],
        direction?: string,
        globalOptions?: any
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

            const isVertical = direction === 'DOWN';

            // Dynamic Port Configuration
            const ports: ElkPort[] = isVertical ? [
                {
                    id: `${node.id}_in`,
                    width: 0, height: 0,
                    x: width / 2, y: 0, // Top center
                    layoutOptions: { 'elk.port.side': 'NORTH' }
                },
                {
                    id: `${node.id}_out`,
                    width: 0, height: 0,
                    x: width / 2, y: height, // Bottom center
                    layoutOptions: { 'elk.port.side': 'SOUTH' }
                }
            ] : [
                {
                    id: `${node.id}_in`,
                    width: 0, height: 0,
                    x: 0, y: height / 2, // Left center
                    layoutOptions: { 'elk.port.side': 'WEST' }
                },
                {
                    id: `${node.id}_out`,
                    width: 0, height: 0,
                    x: width, y: height / 2, // Right center
                    layoutOptions: { 'elk.port.side': 'EAST' }
                }
            ];

            return {
                id: node.id,
                width: width,
                height: height,
                layoutOptions: {
                    'org.eclipse.elk.partitioning.partition': partitionIndex?.toString() || "0",
                    'elk.portConstraints': 'FIXED_POS',
                    ...node.layoutOptions
                },
                ports: ports
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

        // 6. Define Root Graph Options (Gold Standard)
        const defaultOptions = {
            'elk.algorithm': 'layered',
            'elk.direction': direction,
            'org.eclipse.elk.partitioning.activate': 'true',

            // Spacing (The "Air" in the graph)
            'elk.spacing.nodeNode': '40', // Horizontal gap
            'elk.layered.spacing.nodeNodeBetweenLayers': '60', // Vertical gap
            'elk.spacing.edgeNode': '20',

            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.layered.mergeEdges': 'false',
            'elk.layered.crossingMinimization.strategy': 'INTERACTIVE',

            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.edgeStraightening': 'MAXIMIZE_STRAIGHTNESS',
            'elk.layered.nodePlacement.favorStraightEdges': 'true',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED'
        };

        const finalOptions = { ...defaultOptions, ...globalOptions };

        const rootGraph: ElkNode = {
            id: 'root',
            layoutOptions: finalOptions,
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