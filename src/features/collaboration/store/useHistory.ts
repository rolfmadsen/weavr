import { useState, useCallback } from 'react';
import { Node, Link, ElementType } from '../../modeling';
import { ModelingEvent } from '../../modeling/domain/events';
import { HistoryAction } from '../domain/history';

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
                case ModelingEvent.NodeAdded:
                    onDeleteNode(action.payload.id);
                    break;
                case ModelingEvent.NodeDeleted:
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
                case ModelingEvent.NodeMoved:
                    onMoveNode(action.payload.id, action.undoPayload.x, action.undoPayload.y);
                    break;

                // 2. Handle BATCH_MOVE Undo (Restore old positions)
                case ModelingEvent.BatchMove:
                    if (Array.isArray(action.undoPayload)) {
                        action.undoPayload.forEach((item: { id: string, x: number, y: number }) => {
                            onMoveNode(item.id, item.x, item.y);
                        });
                    }
                    break;

                case ModelingEvent.LinkAdded:
                    onDeleteLink(action.payload.id);
                    break;
                case ModelingEvent.LinkDeleted:
                    const link = action.undoPayload;
                    onAddLink(link.source, link.target, link.label, link.id);
                    break;
                case ModelingEvent.NodeRenamed:
                case ModelingEvent.NodeUpdated:
                    onUpdateNode(action.payload.id, action.undoPayload);
                    break;
                case ModelingEvent.LinkUpdated:
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
                case ModelingEvent.NodeAdded:
                    const node = action.payload;
                    onAddNode(node.type, node.x, node.y, node.id);
                    break;
                case ModelingEvent.NodeDeleted:
                    onDeleteNode(action.payload.id);
                    break;
                case ModelingEvent.NodeMoved:
                    onMoveNode(action.payload.id, action.payload.x, action.payload.y);
                    break;

                // 3. Handle BATCH_MOVE Redo (Re-apply new positions)
                case ModelingEvent.BatchMove:
                    if (Array.isArray(action.payload)) {
                        action.payload.forEach((item: { id: string, x: number, y: number }) => {
                            onMoveNode(item.id, item.x, item.y);
                        });
                    }
                    break;

                case ModelingEvent.LinkAdded:
                    const linkPayload = action.payload;
                    onAddLink(linkPayload.source, linkPayload.target, linkPayload.label, linkPayload.id);
                    break;
                case ModelingEvent.LinkDeleted:
                    onDeleteLink(action.payload.id);
                    break;
                case ModelingEvent.NodeRenamed:
                case ModelingEvent.NodeUpdated:
                    onUpdateNode(action.payload.id, action.payload.data);
                    break;
                case ModelingEvent.LinkUpdated:
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