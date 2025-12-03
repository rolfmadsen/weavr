import ELK from 'elkjs/lib/elk-api.js';
import type { ElkNode, ElkExtendedEdge, ElkPort } from 'elkjs';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../../../shared/constants';

// Interfaces for data received from Main Thread
interface WorkerNode {
    id: string;
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    computedHeight?: number; // Pre-calculated in main thread
    type?: string; // For potential partitioning
    sliceId?: string; // Explicit slice association
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
    const { nodes, links, slices, globalOptions = {} } = e.data as {
        nodes: WorkerNode[],
        links: WorkerLink[],
        slices: WorkerSlice[],
        globalOptions?: any
    };

    try {
        // 1. Map for quick lookup
        const nodeMap = new Map<string, WorkerNode>();
        nodes.forEach(n => nodeMap.set(n.id, n));
        const validNodeIds = new Set(nodes.map(n => n.id));

        // 2. Map Node IDs to Slice IDs
        const nodeSliceMap = new Map<string, string>();

        // Priority 1: Use explicit sliceId from node
        nodes.forEach(node => {
            if (node.sliceId) {
                // Verify slice exists in the slices list
                if (slices.some(s => s.id === node.sliceId)) {
                    nodeSliceMap.set(node.id, node.sliceId);
                }
            }
        });

        // Priority 2: Fallback to slice.nodeIds (if not already set)
        slices.forEach(slice => {
            slice.nodeIds.forEach(nodeId => {
                if (validNodeIds.has(nodeId) && !nodeSliceMap.has(nodeId)) {
                    nodeSliceMap.set(nodeId, slice.id);
                }
            });
        });

        // 2b. Handle Loose Nodes (Assign to Default Slice)
        const DEFAULT_SLICE_ID = '__default_slice__';
        nodes.forEach(node => {
            if (!nodeSliceMap.has(node.id)) {
                nodeSliceMap.set(node.id, DEFAULT_SLICE_ID);
            }
        });

        // 3. Helper: Create ELK Node
        const createElkNode = (node: WorkerNode, isVertical: boolean): ElkNode => {
            const height = node.computedHeight || node.height || MIN_NODE_HEIGHT;
            const width = node.width || NODE_WIDTH;

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
                    'elk.portConstraints': 'FIXED_POS',
                    ...node.layoutOptions
                },
                ports: ports
            };
        };

        // 4. Build Hierarchy
        const rootChildren: ElkNode[] = [];
        const rootEdges: ElkExtendedEdge[] = [];

        // Group nodes by slice
        const sliceNodesMap = new Map<string, ElkNode[]>();

        nodes.forEach(node => {
            const sliceId = nodeSliceMap.get(node.id)!;
            const elkNode = createElkNode(node, true); // Inside slice is always DOWN (Vertical)

            if (!sliceNodesMap.has(sliceId)) sliceNodesMap.set(sliceId, []);
            sliceNodesMap.get(sliceId)!.push(elkNode);
        });

        // Create Slice Nodes (Containers)
        slices.forEach(slice => {
            const children = sliceNodesMap.get(slice.id) || [];
            if (children.length === 0) return; // Skip empty slices

            rootChildren.push({
                id: slice.id,
                children: children,
                layoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': 'DOWN', // Slice internal direction
                    'elk.padding': '[top=40,left=20,bottom=20,right=20]',
                    'elk.spacing.nodeNode': '40',
                    'elk.layered.spacing.nodeNodeBetweenLayers': '60',
                    // Ensure internal edges are routed vertically
                    'elk.edgeRouting': 'ORTHOGONAL'
                },
                edges: [] // Intra-slice edges will be added here
            });
        });

        // Handle Default Slice (Loose Nodes)
        if (sliceNodesMap.has(DEFAULT_SLICE_ID)) {
            const children = sliceNodesMap.get(DEFAULT_SLICE_ID)!;
            rootChildren.push({
                id: DEFAULT_SLICE_ID,
                children: children,
                layoutOptions: {
                    'elk.algorithm': 'layered',
                    'elk.direction': 'DOWN',
                    'elk.padding': '[top=20,left=20,bottom=20,right=20]',
                    'elk.spacing.nodeNode': '40',
                    'elk.layered.spacing.nodeNodeBetweenLayers': '60',
                    'elk.edgeRouting': 'ORTHOGONAL'
                },
                edges: []
            });
        }

        // Add loose nodes to root (or a default container?)
        // For now, add them to root. They will be laid out Left-to-Right along with Slices.
        // looseNodes.forEach(n => rootChildren.push(n));


        // 5. Process Edges
        const interSliceEdges: WorkerLink[] = [];
        const sliceDependencies = new Set<string>(); // "SliceA->SliceB"

        links.forEach(link => {
            if (!validNodeIds.has(link.source) || !validNodeIds.has(link.target)) return;

            const sourceSliceId = nodeSliceMap.get(link.source);
            const targetSliceId = nodeSliceMap.get(link.target);

            if (sourceSliceId && targetSliceId && sourceSliceId === targetSliceId) {
                // A. Intra-Slice Edge
                const sliceNode = rootChildren.find(c => c.id === sourceSliceId);
                if (sliceNode && sliceNode.edges) {
                    sliceNode.edges.push({
                        id: link.id,
                        sources: [link.source],
                        targets: [link.target]
                    });
                }
            } else {
                // B. Inter-Slice Edge (or involves loose nodes)
                interSliceEdges.push(link);

                // Synthetic Edge Logic
                if (sourceSliceId && targetSliceId && sourceSliceId !== targetSliceId) {
                    const depKey = `${sourceSliceId}->${targetSliceId}`;
                    if (!sliceDependencies.has(depKey)) {
                        sliceDependencies.add(depKey);
                        rootEdges.push({
                            id: `synthetic-${depKey}`,
                            sources: [sourceSliceId],
                            targets: [targetSliceId],
                            layoutOptions: {
                                // Make these invisible or minimal impact if possible, 
                                // but they are needed for ordering.
                            }
                        });
                    }
                }
            }
        });

        // 6. Define Root Graph Options
        const finalOptions = {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT', // Root direction
            'elk.hierarchyHandling': 'SEPARATE_CHILDREN', // Treat slices as black boxes
            'elk.spacing.nodeNode': '80', // Gap between slices
            'elk.layered.spacing.nodeNodeBetweenLayers': '80',
            'elk.edgeRouting': 'ORTHOGONAL',
            ...globalOptions
        };

        const rootGraph: ElkNode = {
            id: 'root',
            layoutOptions: finalOptions,
            children: rootChildren,
            edges: rootEdges
        };

        // 7. Execute Layout
        const layout = await elk.layout(rootGraph);

        // 8. Process Results
        const positions: Record<string, { x: number, y: number }> = {};
        const edgeRoutes: Record<string, number[]> = {};

        // Helper to get absolute position of a node
        const getAbsolutePosition = (nodeId: string): { x: number, y: number, width: number, height: number } | null => {
            // Find the node in the layout tree
            // This is a bit inefficient, but robust

            // Check slices
            for (const child of layout.children || []) {
                if (child.id === nodeId) {
                    return { x: child.x || 0, y: child.y || 0, width: child.width || 0, height: child.height || 0 };
                }
                if (child.children) {
                    const inner = child.children.find(n => n.id === nodeId);
                    if (inner) {
                        return {
                            x: (child.x || 0) + (inner.x || 0),
                            y: (child.y || 0) + (inner.y || 0),
                            width: inner.width || 0,
                            height: inner.height || 0
                        };
                    }
                }
            }
            return null;
        };

        // Populate positions
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

        // 9. Manual Edge Routing for Inter-Slice Edges
        interSliceEdges.forEach(link => {
            const sourcePos = getAbsolutePosition(link.source);
            const targetPos = getAbsolutePosition(link.target);
            const sourceSliceId = nodeSliceMap.get(link.source);
            const targetSliceId = nodeSliceMap.get(link.target);

            if (sourcePos && targetPos && sourceSliceId && targetSliceId && sourceSliceId !== targetSliceId) {
                // Get Slice Bounding Boxes
                const sourceSlice = layout.children?.find(c => c.id === sourceSliceId);
                const targetSlice = layout.children?.find(c => c.id === targetSliceId);

                if (sourceSlice && targetSlice) {
                    const sourceSliceRight = (sourceSlice.x || 0) + (sourceSlice.width || 0);
                    const targetSliceLeft = (targetSlice.x || 0);

                    // Calculate Gap Center
                    // If target is to the right of source (normal flow)
                    let gapCenter: number;
                    if (targetSliceLeft > sourceSliceRight) {
                        gapCenter = (sourceSliceRight + targetSliceLeft) / 2;
                    } else {
                        // Overlap or backward edge: Just put it in between the node centers?
                        // Or fallback to a default offset
                        gapCenter = sourceSliceRight + 40; // Default buffer
                    }

                    // 4-Point Path
                    // Start: Node A Center Right (or just Center)
                    // Bend 1: Gap Center, Node A Y
                    // Bend 2: Gap Center, Node B Y
                    // End: Node B Center Left

                    const startX = sourcePos.x + sourcePos.width; // Right side of source node
                    const startY = sourcePos.y + sourcePos.height / 2;

                    const endX = targetPos.x; // Left side of target node
                    const endY = targetPos.y + targetPos.height / 2;

                    // Adjust Gap Center to be grid aligned
                    const GRID = 20;
                    const bendX = Math.round(gapCenter / GRID) * GRID;

                    // Snap start/end points to grid to match node positions
                    const snappedStartX = Math.round(startX / GRID) * GRID;
                    const snappedStartY = Math.round(startY / GRID) * GRID;
                    const snappedEndX = Math.round(endX / GRID) * GRID;
                    const snappedEndY = Math.round(endY / GRID) * GRID;

                    edgeRoutes[link.id] = [
                        snappedStartX, snappedStartY,
                        bendX, snappedStartY,
                        bendX, snappedEndY,
                        snappedEndX, snappedEndY
                    ];
                    return;
                }
            }

            // Fallback for loose nodes or non-standard layouts:
            // Let the frontend calculate it (don't return a route)
            // OR calculate a simple direct path here?
            // If we don't return a route, GraphCanvasKonva uses calculateOrthogonalPathPoints
        });

        // 10. Reply to Main Thread
        self.postMessage({ type: 'SUCCESS', positions, edgeRoutes });

    } catch (error) {
        self.postMessage({ type: 'ERROR', message: String(error) });
    }
};