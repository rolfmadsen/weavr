import { Node, Link, Slice } from '../types';
import { v4 as uuidv4 } from 'uuid';

const SLICE_COLORS = [
    'rgba(59, 130, 246, 0.1)',   // Blue
    'rgba(34, 197, 94, 0.1)',    // Green
    'rgba(168, 85, 247, 0.1)',   // Purple
    'rgba(249, 115, 22, 0.1)',   // Orange
    'rgba(239, 68, 68, 0.1)',    // Red
    'rgba(234, 179, 8, 0.1)',    // Yellow
];

class SliceService {
    /**
     * Calculates slices by identifying connected components in the graph.
     * This approach ensures that entire workflows, even those combining multiple
     * Event Modeling patterns, are grouped into a single, comprehensive slice.
     */
    public calculateSlices(nodes: Node[], links: Link[]): { slices: Slice[], nodeSliceMap: Map<string, string> } {
        const nodeSliceMap = new Map<string, string>();
        const slices: Slice[] = [];

        // Build an adjacency list for an undirected graph to represent connections.
        const adj = new Map<string, string[]>();
        nodes.forEach(node => adj.set(node.id, []));
        links.forEach(link => {
            adj.get(link.source)?.push(link.target);
            adj.get(link.target)?.push(link.source);
        });

        // Iterate through each node to find un-sliced components.
        for (const node of nodes) {
            // If the node is already part of a slice, skip it.
            if (nodeSliceMap.has(node.id)) {
                continue;
            }

            // Start a Breadth-First Search (BFS) to find the entire connected component.
            const componentNodes = new Set<string>();
            const queue: string[] = [node.id];
            const visited = new Set<string>([node.id]);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                
                // If a node in the traversal path was somehow already sliced, respect that.
                if (nodeSliceMap.has(currentId)) {
                    continue;
                }
                componentNodes.add(currentId);

                // Explore neighbors.
                const neighbors = adj.get(currentId) || [];
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }

            // If we found any nodes for this component, create a new slice.
            if (componentNodes.size > 0) {
                const sliceId = uuidv4();
                slices.push({
                    id: sliceId,
                    nodeIds: componentNodes,
                    color: SLICE_COLORS[slices.length % SLICE_COLORS.length],
                });
                // Assign all nodes in the component to the new slice ID.
                componentNodes.forEach(nodeId => nodeSliceMap.set(nodeId, sliceId));
            }
        }

        return { slices, nodeSliceMap };
    }
}

const sliceService = new SliceService();
export default sliceService;
