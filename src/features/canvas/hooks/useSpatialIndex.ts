import { useCallback, useMemo } from 'react';
import RBush from 'rbush';
import { Node } from '../../modeling';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../../../shared/constants';
import { calculateNodeHeight } from '../../modeling';

export interface SpatialNode {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    id: string;
    node: Node;
}

export const useSpatialIndex = (nodes: Node[]) => {
    // Rebuild index whenever nodes change.
    // usage of useMemo ensures the tree is ready during render, preventing race conditions
    // where the canvas tries to query the tree before a useEffect would have updated it.
    const tree = useMemo(() => {
        const t = new RBush<SpatialNode>();
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
        t.load(bulk);
        return t;
    }, [nodes]);

    const search = useCallback((rect: { minX: number, minY: number, maxX: number, maxY: number }): SpatialNode[] => {
        return tree.search(rect);
    }, [tree]);

    return { search };
};
