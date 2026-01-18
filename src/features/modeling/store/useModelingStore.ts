
import { useCallback } from 'react';
import { useModelManager } from './useModelManager';
import { ModelingEvent } from '../domain/events';

// Re-export event types
export { ModelingEvent };

export const useModelingStore = (props: any) => {
    // Reuse existing logic for now, or this could become the new home for it
    const manager = useModelManager(props);

    // map generic updates to semantic actions
    const moveNode = useCallback((id: string, x: number, y: number) => {
        // Semantic wrapper
        manager.gunUpdateNodePosition(id, x, y);
    }, [manager]);

    const renameNode = useCallback((id: string, name: string) => {
        manager.handleUpdateNode(id, 'name', name);
    }, [manager]);

    const addNode = useCallback((type: any) => {
        manager.handleAddNode(type);
    }, [manager]);

    const moveNodes = useCallback((updates: { id: string, x: number, y: number }[]) => {
        manager.gunUpdateNodePositionsBatch(updates);
    }, [manager]);

    return {
        ...manager,
        // Semantic Actions
        moveNode,
        moveNodes,
        renameNode,
        addNode
    };
};
