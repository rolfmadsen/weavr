
import { useCallback } from 'react';
import { useModelManager } from './useModelManager';
import { ElementType, Node } from '../domain/types';
import { ModelingEvent } from '../domain/events';
import { bus } from '../../../shared/events/eventBus';


// Re-export event types
export { ModelingEvent };

export const useModelingStore = (props: any) => {
    // Reuse existing logic for now, or this could become the new home for it
    const manager = useModelManager(props);

    // map generic updates to semantic actions
    const moveNode = useCallback((id: string, x: number, y: number) => {
        bus.emit('command:moveNode', { id, x, y, pinned: true });
    }, []);

    const renameNode = useCallback((id: string, name: string) => {
        manager.handleUpdateNode(id, 'name', name);
    }, [manager]);

    const addNode = useCallback((type: ElementType) => {
        manager.handleAddNode(type);
    }, [manager]);

    const pasteNodes = useCallback((nodes: Node[]) => {
        manager.pasteNodes(nodes);
    }, [manager]);

    const moveNodes = useCallback((updates: { id: string, x: number, y: number }[]) => {
        bus.emit('command:moveNodes', { updates, pinned: true });
    }, []);

    return {
        ...manager,
        orphanedFields: manager.orphanedFields,
        handleLinkFieldToDefinition: manager.handleLinkFieldToDefinition,
        // Semantic Actions
        moveNode,
        moveNodes,
        renameNode,
        addNode,
        pasteNodes,
        focusOnRender: manager.focusOnRender,
        setFocusOnRender: manager.setFocusOnRender
    };
};
