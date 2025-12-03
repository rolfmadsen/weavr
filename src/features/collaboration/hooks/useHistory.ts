import { useState, useCallback } from 'react';
import { Node, Link, ElementType } from '../../modeling';

// 1. Add 'BATCH_MOVE' to the supported types
type ActionType =
    | 'ADD_NODE'
    | 'DELETE_NODE'
    | 'MOVE_NODE'
    | 'ADD_LINK'
    | 'DELETE_LINK'
    | 'UPDATE_NODE'
    | 'UPDATE_LINK'
    | 'BATCH_MOVE';

interface HistoryAction {
    type: ActionType;
    payload: any;
    undoPayload: any;
}

interface UseHistoryProps {
    onAddNode: (type: ElementType, x: number, y: number, id?: string) => void;
    onDeleteNode: (id: string) => void;
    onUpdateNode: (id: string, data: Partial<Node>) => void;
    onAddLink: (source: string, target: string, label: string, id?: string) => void;
    onDeleteLink: (id: string) => void;
    onUpdateLink: (id: string, data: Partial<Link>) => void;
    onMoveNode: (id: string, x: number, y: number) => void;
}

export function useHistory({
    onAddNode,
    onDeleteNode,
    onUpdateNode,
    onAddLink,
    onDeleteLink,
    onUpdateLink,
    onMoveNode
}: UseHistoryProps) {
    const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
    const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

    const addToHistory = useCallback((action: HistoryAction) => {
        setUndoStack(prev => [...prev, action]);
        setRedoStack([]); // Clear redo stack on new action
    }, []);

    const undo = useCallback(() => {
        setUndoStack(prev => {
            if (prev.length === 0) return prev;
            const action = prev[prev.length - 1];
            const newStack = prev.slice(0, -1);

            // Execute undo logic
            switch (action.type) {
                case 'ADD_NODE':
                    onDeleteNode(action.payload.id);
                    break;
                case 'DELETE_NODE':
                    // Restore node
                    const { node, links } = action.undoPayload;
                    const x = node.fx ?? node.x ?? 0;
                    const y = node.fy ?? node.y ?? 0;
                    onAddNode(node.type, x, y, node.id);
                    onUpdateNode(node.id, { name: node.name, description: node.description });

                    // Restore connected links
                    if (links && Array.isArray(links)) {
                        links.forEach((link: Link) => {
                            onAddLink(link.source, link.target, link.label, link.id);
                        });
                    }
                    break;
                case 'MOVE_NODE':
                    onMoveNode(action.payload.id, action.undoPayload.x, action.undoPayload.y);
                    break;

                // 2. Handle BATCH_MOVE Undo (Restore old positions)
                case 'BATCH_MOVE':
                    if (Array.isArray(action.undoPayload)) {
                        action.undoPayload.forEach((item: { id: string, x: number, y: number }) => {
                            onMoveNode(item.id, item.x, item.y);
                        });
                    }
                    break;

                case 'ADD_LINK':
                    onDeleteLink(action.payload.id);
                    break;
                case 'DELETE_LINK':
                    const link = action.undoPayload;
                    onAddLink(link.source, link.target, link.label, link.id);
                    break;
                case 'UPDATE_NODE':
                    onUpdateNode(action.payload.id, action.undoPayload);
                    break;
                case 'UPDATE_LINK':
                    onUpdateLink(action.payload.id, action.undoPayload);
                    break;
            }

            setRedoStack(r => [...r, action]);
            return newStack;
        });
    }, [onAddNode, onDeleteNode, onUpdateNode, onAddLink, onDeleteLink, onUpdateLink, onMoveNode]);

    const redo = useCallback(() => {
        setRedoStack(prev => {
            if (prev.length === 0) return prev;
            const action = prev[prev.length - 1];
            const newStack = prev.slice(0, -1);

            // Execute redo logic
            switch (action.type) {
                case 'ADD_NODE':
                    const node = action.payload;
                    onAddNode(node.type, node.x, node.y, node.id);
                    break;
                case 'DELETE_NODE':
                    onDeleteNode(action.payload.id);
                    break;
                case 'MOVE_NODE':
                    onMoveNode(action.payload.id, action.payload.x, action.payload.y);
                    break;

                // 3. Handle BATCH_MOVE Redo (Re-apply new positions)
                case 'BATCH_MOVE':
                    if (Array.isArray(action.payload)) {
                        action.payload.forEach((item: { id: string, x: number, y: number }) => {
                            onMoveNode(item.id, item.x, item.y);
                        });
                    }
                    break;

                case 'ADD_LINK':
                    const linkPayload = action.payload;
                    onAddLink(linkPayload.source, linkPayload.target, linkPayload.label, linkPayload.id);
                    break;
                case 'DELETE_LINK':
                    onDeleteLink(action.payload.id);
                    break;
                case 'UPDATE_NODE':
                    onUpdateNode(action.payload.id, action.payload.data);
                    break;
                case 'UPDATE_LINK':
                    onUpdateLink(action.payload.id, action.payload.data);
                    break;
            }

            setUndoStack(u => [...u, action]);
            return newStack;
        });
    }, [onAddNode, onDeleteNode, onUpdateNode, onAddLink, onDeleteLink, onUpdateLink, onMoveNode]);

    return {
        undo,
        redo,
        addToHistory,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0
    };
}