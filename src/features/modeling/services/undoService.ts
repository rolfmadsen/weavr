import { bus } from '../../../shared/events/eventBus';
import { ModelingCommand } from '../../../shared/events/types';
import { useModelingData } from '../store/modelingStore';


interface CommandStackItem {
    undo: ModelingCommand[];
    redo: ModelingCommand[];
}

export const initUndoService = () => {
    const undoStack: CommandStackItem[] = [];
    const redoStack: CommandStackItem[] = [];

    // Flag to prevent loop when executing undo/redo
    let isUndoing = false;
    let isRedoing = false;

    const updateStore = () => {
        useModelingData.getState().setHistoryState(undoStack.length > 0, redoStack.length > 0);
    };

    // Helper to add to stack
    const push = (undo: ModelingCommand | ModelingCommand[], redo: ModelingCommand | ModelingCommand[]) => {
        if (isUndoing || isRedoing) return;
        console.log('[UndoService] Pushing to stack', { undo, redo });
        undoStack.push({
            undo: Array.isArray(undo) ? undo : [undo],
            redo: Array.isArray(redo) ? redo : [redo]
        });
        redoStack.length = 0; // Clear redo on new action
        if (undoStack.length > 50) undoStack.shift();
        updateStore();
    };

    // ------------------------------------------------------------------
    // Event Listeners -> Build Stack
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // NODES
    // ------------------------------------------------------------------
    bus.on('node:created', (node) => {
        push(
            { type: 'command:deleteNode', payload: { id: node.id } },
            {
                type: 'command:createNode',
                payload: {
                    type: node.type,
                    x: node.x || 0,
                    y: node.y || 0,
                    id: node.id,
                    sliceId: node.sliceId
                }
            }
        );
    });

    bus.on('node:deleted', ({ id, node }) => {
        // Restore requires Create + Update to restore full state (name, desc, etc)
        const { id: _, type, x, y, sliceId, ...rest } = node;
        const restoreCommands: ModelingCommand[] = [
            {
                type: 'command:createNode',
                payload: {
                    id: node.id,
                    type: node.type,
                    x: node.x || 0,
                    y: node.y || 0,
                    sliceId: node.sliceId
                }
            },
            { type: 'command:updateNode', payload: { id: node.id, changes: rest } }
        ];

        push(
            restoreCommands,
            { type: 'command:deleteNode', payload: { id } }
        );
    });

    bus.on('node:updated', ({ id, changes, previous }) => {
        if (!previous) return;
        push(
            { type: 'command:updateNode', payload: { id, changes: previous } },
            { type: 'command:updateNode', payload: { id, changes } }
        );
    });

    bus.on('node:moved', ({ id, x, y, pinned, previous }) => {
        if (!previous) return;
        push(
            { type: 'command:moveNode', payload: { id, x: previous.x, y: previous.y, pinned: previous.pinned } },
            { type: 'command:moveNode', payload: { id, x, y, pinned } }
        );
    });

    bus.on('nodes:moved', ({ updates, previous, pinned }) => {
        if (!previous || previous.length === 0) return;
        push(
            { type: 'command:moveNodes', payload: { updates: previous, pinned: previous[0].pinned } },
            { type: 'command:moveNodes', payload: { updates, pinned: pinned } }
        );
    });

    bus.on('node:pinned', ({ id, pinned }) => {
        push(
            { type: pinned ? 'command:unpinNode' : 'command:pinNode', payload: { id } },
            { type: pinned ? 'command:pinNode' : 'command:unpinNode', payload: { id } }
        );
    });

    bus.on('nodes:pinned', ({ ids, pinned }) => {
        push(
            { type: pinned ? 'command:unpinNodes' : 'command:pinNodes', payload: { ids } },
            { type: pinned ? 'command:pinNodes' : 'command:unpinNodes', payload: { ids } }
        );
    });

    // ------------------------------------------------------------------
    // SLICES
    // ------------------------------------------------------------------
    bus.on('slice:created', (slice) => {
        push(
            { type: 'command:deleteSlice', payload: { id: slice.id } },
            { type: 'command:createSlice', payload: { title: slice.title || 'Untitled', order: slice.order || 0, id: slice.id } }
        );
    });

    bus.on('slice:deleted', ({ id, slice }) => {
        const { id: _, title, order, ...rest } = slice;
        const restoreCommands: ModelingCommand[] = [
            { type: 'command:createSlice', payload: { id: slice.id, title: title || 'Untitled', order: order || 0 } },
            { type: 'command:updateSlice', payload: { id: slice.id, changes: rest } }
        ];

        push(
            restoreCommands,
            { type: 'command:deleteSlice', payload: { id } }
        );
    });

    bus.on('slice:updated', ({ id, changes, previous }) => {
        if (!previous) return;
        push(
            { type: 'command:updateSlice', payload: { id, changes: previous } },
            { type: 'command:updateSlice', payload: { id, changes } }
        );
    });

    // ------------------------------------------------------------------
    // LINKS
    // ------------------------------------------------------------------
    bus.on('link:created', (link) => {
        push(
            { type: 'command:deleteLink', payload: { id: link.id } },
            { type: 'command:createLink', payload: { sourceId: link.source, targetId: link.target, id: link.id } }
        );
    });

    bus.on('link:deleted', ({ id, link }) => {
        push(
            { type: 'command:createLink', payload: { sourceId: link.source, targetId: link.target, id: link.id } },
            { type: 'command:deleteLink', payload: { id } }
        );
    });

    // ------------------------------------------------------------------
    // DEFINITIONS
    // ------------------------------------------------------------------
    bus.on('definition:created', (def) => {
        push(
            { type: 'command:deleteDefinition', payload: { id: def.id } },
            { type: 'command:createDefinition', payload: { name: def.name, type: def.type, id: def.id } }
        );
    });

    bus.on('definition:deleted', ({ id, definition }) => {
        const { id: _, name, type, ...rest } = definition;
        const restoreCommands: ModelingCommand[] = [
            { type: 'command:createDefinition', payload: { id: definition.id, name, type: type || 'Value Object' } },
            { type: 'command:updateDefinition', payload: { id: definition.id, changes: rest } }
        ];

        push(
            restoreCommands,
            { type: 'command:deleteDefinition', payload: { id } }
        );
    });

    // ------------------------------------------------------------------
    // EXECUTION
    // ------------------------------------------------------------------
    bus.on('command:undo', () => {
        const item = undoStack.pop();
        if (!item) return;

        isUndoing = true;
        redoStack.push(item);
        item.undo.forEach(cmd => bus.emit(cmd.type as any, (cmd as any).payload)); // Dispatch mapped command
        isUndoing = false;
        updateStore();
    });

    bus.on('history:clear', () => {
        undoStack.length = 0;
        redoStack.length = 0;
        updateStore();
        console.log('[UndoService] History Cleared');
    });

    bus.on('command:redo', () => {
        const item = redoStack.pop();
        if (!item) return;

        isRedoing = true;
        undoStack.push(item);
        item.redo.forEach(cmd => bus.emit(cmd.type as any, (cmd as any).payload));
        isRedoing = false;
        updateStore();
    });

    console.log('[UndoService] Initialized');
};
