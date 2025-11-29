import { useRef, useCallback, useEffect } from 'react';
import RBush from 'rbush';
import { Node } from '../types';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';
import { calculateNodeHeight } from '../utils/textUtils';

export interface SpatialNode {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    node: Node;
}

export const useSpatialIndex = (nodes: Node[]) => {
    const treeRef = useRef<RBush<SpatialNode>>(new RBush());

    // Rebuild index when nodes change
    // Note: If nodes change frequently (e.g. every drag frame), this might be too heavy.
    // But usually 'nodes' state in React updates on drag END or via optimistic updates.
    // If we use optimistic updates on drag, we need to be careful.
    // For now, let's assume full rebuild is okay for < 5000 nodes.
    useEffect(() => {
        const tree = new RBush<SpatialNode>();
        const bulk: SpatialNode[] = nodes.map(node => {
            const height = calculateNodeHeight(node.name) || MIN_NODE_HEIGHT;
            return {
                minX: node.x || 0,
                minY: node.y || 0,
                maxX: (node.x || 0) + NODE_WIDTH,
                maxY: (node.y || 0) + height,
                id: node.id,
                node: node
            };
        });
        tree.load(bulk);
        treeRef.current = tree;
    }, [nodes]);

    const search = useCallback((rect: { minX: number, minY: number, maxX: number, maxY: number }): SpatialNode[] => {
        return treeRef.current.search(rect);
    }, []);

    return { search };
};
