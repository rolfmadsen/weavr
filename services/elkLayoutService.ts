import ELK from 'elkjs/lib/elk.bundled.js'; // Note the .js extension
import type { ElkNode, ElkExtendedEdge, ElkPort } from 'elkjs';
import { Node, Link, Slice } from '../types';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';
import { calculateNodeHeight } from '../utils/textUtils';

const elk = new ELK();

export const calculateElkLayout = async (
    nodes: Node[],
    links: Link[],
    slices: Slice[] = []
): Promise<Map<string, { x: number; y: number }>> => {

    // 1. Map for quick lookup to ensure we only return valid nodes later
    const validNodeIds = new Set(nodes.map(n => n.id));
    const nodesBySlice = new Map<string, Node[]>();
    const unslicedNodes: Node[] = [];

    // Helper: Create a node with centered "Ports"
    // This forces ELK to align the CENTERS of nodes, not the TOP edges.
    const createElkNode = (node: Node): ElkNode => {
        const height = calculateNodeHeight(node.name) || MIN_NODE_HEIGHT;

        return {
            id: node.id,
            width: NODE_WIDTH,
            height: height,
            layoutOptions: {
                'elk.portConstraints': 'FIXED_POS' // Strict port positioning
            },
            ports: [
                {
                    id: `${node.id}_in`,
                    width: 0, height: 0,
                    x: 0, y: height / 2, // Left Center
                    layoutOptions: { 'elk.port.side': 'WEST' }
                } as ElkPort,
                {
                    id: `${node.id}_out`,
                    width: 0, height: 0,
                    x: NODE_WIDTH, y: height / 2, // Right Center
                    layoutOptions: { 'elk.port.side': 'EAST' }
                } as ElkPort
            ]
        };
    };

    nodes.forEach(node => {
        if (!node.id) return; // Skip invalid nodes
        const slice = slices.find(s => s.nodeIds.has(node.id));
        if (slice && slice.id) {
            if (!nodesBySlice.has(slice.id)) nodesBySlice.set(slice.id, []);
            nodesBySlice.get(slice.id)?.push(node);
        } else {
            unslicedNodes.push(node);
        }
    });

    const elkChildren: ElkNode[] = [];

    // Add Slices
    slices.forEach(slice => {
        if (!slice.id) return;
        const sliceNodes = nodesBySlice.get(slice.id) || [];
        if (sliceNodes.length === 0) return;

        elkChildren.push({
            id: slice.id,
            layoutOptions: {
                'elk.direction': 'DOWN',
                'elk.padding': '[top=40,left=40,bottom=40,right=40]',
                'elk.spacing.nodeNode': '40',
            },
            children: sliceNodes.map(createElkNode)
        });
    });

    // Add Unsliced Nodes
    unslicedNodes.forEach(node => {
        elkChildren.push(createElkNode(node));
    });

    // Add Edges
    const elkEdges: ElkExtendedEdge[] = links.map(link => ({
        id: link.id,
        sources: [link.source],
        targets: [link.target]
    }));

    const rootGraph: ElkNode = {
        id: 'root',
        layoutOptions: {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            // ALIGNMENT MAGIC:
            'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
            'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED',
            'elk.edgeRouting': 'ORTHOGONAL',
            'elk.spacing.nodeNode': '80', // More breathing room
            'elk.layered.spacing.edgeNodeBetweenLayers': '50',
        },
        children: elkChildren,
        edges: elkEdges
    };

    // Calculate
    const layout = await elk.layout(rootGraph);
    const positions = new Map<string, { x: number; y: number }>();

    // Recursive extractor
    const processNode = (node: ElkNode, parentX = 0, parentY = 0) => {
        let currentX = parentX + (node.x || 0);
        let currentY = parentY + (node.y || 0);

        // Snap to grid (20px)
        const GRID = 20;
        currentX = Math.round(currentX / GRID) * GRID;
        currentY = Math.round(currentY / GRID) * GRID;

        // Only add to positions if this ID exists in our original nodes list
        // This prevents 'root', slice IDs, or empty IDs from crashing Gun
        if (validNodeIds.has(node.id)) {
            positions.set(node.id, {
                x: currentX,
                y: currentY
            });
        }

        if (node.children) {
            node.children.forEach(child => processNode(child, currentX, currentY));
        }
    };

    if (layout) processNode(layout);
    return positions;
};