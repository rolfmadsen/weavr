import { Node, Slice, ElementType, Link } from '../types';
import { MIN_NODE_HEIGHT, NODE_WIDTH } from '../constants';

const HORIZONTAL_SPACING = 100;
const NODE_VERTICAL_SPACING = 40;
const SLICE_PADDING = 150; // Vertical padding between slices
const TOP_MARGIN = 100;

class LayoutService {
    public calculateSwimlaneLayout(
        slices: Slice[],
        nodes: Node[],
        links: Link[],
        canvasWidth: number
    ): Map<string, { x: number; y: number }> {
        const finalPositions = new Map<string, { x: number; y: number }>();
        const nodesMap = new Map(nodes.map(n => [n.id, n]));

        const sliceLayouts = slices.map(slice => {
            const sliceNodes = Array.from(slice.nodeIds).map(id => nodesMap.get(id)!);
            return this.layoutSlice(sliceNodes, links);
        });

        let currentY = TOP_MARGIN;

        for (const layout of sliceLayouts) {
            // Center each slice horizontally in the canvas
            const xOffset = (canvasWidth - layout.width) / 2;
            for (const [nodeId, pos] of layout.positions.entries()) {
                finalPositions.set(nodeId, {
                    x: xOffset + pos.x,
                    y: currentY + pos.y,
                });
            }
            // Increment Y position for the next slice
            currentY += layout.height + SLICE_PADDING;
        }
        
        return finalPositions;
    }

    private layoutSlice(
        sliceNodes: Node[],
        allLinks: Link[]
    ): { positions: Map<string, { x: number; y: number }>, width: number, height: number } {
        if (sliceNodes.length === 0) {
            return { positions: new Map(), width: 0, height: 0 };
        }
        
        const sliceNodeIds = new Set(sliceNodes.map(n => n.id));
        const sliceLinks = allLinks.filter(l => sliceNodeIds.has(l.source) && sliceNodeIds.has(l.target));
        const nodesMap = new Map(sliceNodes.map(n => [n.id, n]));

        // 1. Layer assignment based purely on topology
        const nodeLayerMap = new Map<string, number>();
        sliceNodes.forEach(node => {
            nodeLayerMap.set(node.id, 0); // Start all nodes at layer 0
        });
        
        // 2. Iteratively enforce left-to-right flow by pushing nodes with incoming edges to later layers
        let changed = true;
        const maxIterations = sliceNodes.length * sliceNodes.length; // A robust iteration limit for convergence
        let iter = 0;
        while(changed && iter < maxIterations) {
            changed = false;
            iter++;
            for (const link of sliceLinks) {
                const sourceLayer = nodeLayerMap.get(link.source)!;
                const targetLayer = nodeLayerMap.get(link.target)!;
                if (sourceLayer >= targetLayer) {
                    nodeLayerMap.set(link.target, sourceLayer + 1);
                    changed = true;
                }
            }
        }
        
        // 3. Handle special case for terminal State View screens to place them at the very end for clarity
        const successors = new Map<string, string[]>();
        sliceNodes.forEach(n => successors.set(n.id, []));
        sliceLinks.forEach(link => successors.get(link.source)?.push(link.target));

        const terminalViewScreenIds = new Set<string>();
        sliceLinks.forEach(link => {
            const sourceNode = nodesMap.get(link.source);
            const targetNode = nodesMap.get(link.target);
            if (sourceNode?.type === ElementType.ReadModel && targetNode?.type === ElementType.Screen) {
                // This is a view screen. Check if it's terminal (no outgoing links in the slice)
                if ((successors.get(targetNode.id) || []).length === 0) {
                    terminalViewScreenIds.add(targetNode.id);
                }
            }
        });

        if (terminalViewScreenIds.size > 0) {
            const maxLayer = Math.max(0, ...Array.from(nodeLayerMap.values()));
            terminalViewScreenIds.forEach(screenId => {
                // Place it in a new layer at the end. This won't create new backward links.
                nodeLayerMap.set(screenId, maxLayer + 1);
            });
        }
        
        // 4. Group nodes into layers and normalize layer indices to be contiguous (e.g., 0, 1, 2, ...)
        const tempLayers = new Map<number, string[]>();
        sliceNodes.forEach(node => {
            const layerIndex = nodeLayerMap.get(node.id)!;
            if (!tempLayers.has(layerIndex)) tempLayers.set(layerIndex, []);
            tempLayers.get(layerIndex)!.push(node.id);
        });
        
        const sortedOriginalLayers = Array.from(tempLayers.keys()).sort((a,b) => a - b);
        const layers = new Map<number, string[]>();
        sortedOriginalLayers.forEach((originalLayer, i) => {
            layers.set(i, tempLayers.get(originalLayer)!);
        });
        
        const sortedLayerIndices = Array.from(layers.keys()).sort((a, b) => a - b);

        // 5. Build predecessor/successor maps for crossing minimization
        const predecessors = new Map<string, string[]>();
        sliceNodes.forEach(n => {
            predecessors.set(n.id, []);
        });
        sliceLinks.forEach(link => {
            successors.get(link.source)?.push(link.target);
            predecessors.get(link.target)?.push(link.source);
        });

        let nodePositionsInLayer = new Map<string, number>();
        const updatePositions = () => {
            const newPositions = new Map<string, number>();
            sortedLayerIndices.forEach(idx => {
                layers.get(idx)!.forEach((nodeId, i) => newPositions.set(nodeId, i));
            });
            nodePositionsInLayer = newPositions;
        };
        updatePositions();
        
        // 6. Iteratively improve vertex ordering to minimize crossings (Barycenter heuristic)
        const calculateBarycenter = (nodes: string[], neighborMap: Map<string, string[]>): Map<string, number> => {
            const weights = new Map<string, number>();
            nodes.forEach(nodeId => {
                const neighbors = neighborMap.get(nodeId)!;
                if (neighbors.length === 0) {
                    weights.set(nodeId, -1); // Nodes with no connections go first
                    return;
                }
                const weight = neighbors.reduce((sum, neighborId) => sum + (nodePositionsInLayer.get(neighborId) || 0), 0) / neighbors.length;
                weights.set(nodeId, weight);
            });
            return weights;
        };

        const ITERATIONS = 24;
        for (let i = 0; i < ITERATIONS; i++) {
            // Downward pass
            for (const layerIndex of sortedLayerIndices) {
                const layerNodes = layers.get(layerIndex)!;
                const weights = calculateBarycenter(layerNodes, predecessors);
                layerNodes.sort((a, b) => weights.get(a)! - weights.get(b)!);
            }
            updatePositions();
            // Upward pass
            for (let j = sortedLayerIndices.length - 1; j >= 0; j--) {
                const layerIndex = sortedLayerIndices[j];
                const layerNodes = layers.get(layerIndex)!;
                const weights = calculateBarycenter(layerNodes, successors);
                layerNodes.sort((a, b) => weights.get(a)! - weights.get(b)!);
            }
            updatePositions();
        }
        
        // 7. Assign final coordinates
        const positions = new Map<string, { x: number; y: number }>();
        const layerXMap = new Map<number, number>();
        let currentX = 0;

        for (const layerIndex of sortedLayerIndices) {
            layerXMap.set(layerIndex, currentX + NODE_WIDTH / 2);
            currentX += NODE_WIDTH + HORIZONTAL_SPACING;
        }
        const sliceWidth = Math.max(0, currentX - HORIZONTAL_SPACING);

        let maxNodesInLayer = 0;
        sortedLayerIndices.forEach(idx => {
            maxNodesInLayer = Math.max(maxNodesInLayer, layers.get(idx)!.length);
        });
        const sliceHeight = Math.max(0, maxNodesInLayer * (MIN_NODE_HEIGHT + NODE_VERTICAL_SPACING) - NODE_VERTICAL_SPACING);

        for (const layerIndex of sortedLayerIndices) {
            const layer = layers.get(layerIndex)!;
            const layerHeight = Math.max(0, layer.length * (MIN_NODE_HEIGHT + NODE_VERTICAL_SPACING) - NODE_VERTICAL_SPACING);
            const yOffset = (sliceHeight - layerHeight) / 2;

            layer.forEach((nodeId, i) => {
                const x = layerXMap.get(layerIndex)!;
                const y = yOffset + i * (MIN_NODE_HEIGHT + NODE_VERTICAL_SPACING) + MIN_NODE_HEIGHT / 2;
                positions.set(nodeId, { x, y });
            });
        }

        return { positions, width: sliceWidth, height: sliceHeight };
    }
}

const layoutService = new LayoutService();
export default layoutService;
