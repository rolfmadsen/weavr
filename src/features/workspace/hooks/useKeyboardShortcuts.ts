import { useEffect } from 'react';
import { Node, ElementType } from '../../modeling';
import { GRID_SIZE } from '../../../shared/constants';

interface UseKeyboardShortcutsProps {
    nodes: Node[];
    selectedNodeIds: string[];
    selectedLinkId: string | null;
    isPanelOpen: boolean;
    isToolbarOpen: boolean;
    isReady: boolean;
    showSlices: boolean;
    swimlanePositions: Map<string, { x: number, y: number }>;
    onDeleteSelection: () => void;
    onClosePanel: () => void;
    onToggleToolbar: () => void;
    onOpenPropertiesPanel: () => void;
    onOpenSlices?: () => void;
    onOpenDictionary?: () => void;
    onSelectNode: (node: Node, event?: any) => void;
    onAddNode: (type: ElementType) => void;
    onMoveNodes: (updates: Map<string, { fx: number, fy: number }>) => void;
    onFocusNode: () => void;
    onUndo: () => void;
    onRedo: () => void;
}

export function useKeyboardShortcuts({
    nodes,
    selectedNodeIds,
    selectedLinkId,
    isPanelOpen,
    isToolbarOpen,
    isReady,
    showSlices,
    swimlanePositions,
    onDeleteSelection,
    onClosePanel,
    onToggleToolbar,
    onOpenPropertiesPanel,
    onOpenSlices,
    onOpenDictionary,
    onSelectNode,
    onAddNode,
    onMoveNodes,
    onFocusNode,
    onUndo,
    onRedo
}: UseKeyboardShortcutsProps) {

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                if (isPanelOpen) {
                    onClosePanel();
                } else if (selectedNodeIds.length > 0 || selectedLinkId) {
                    onClosePanel(); // This effectively clears selection in the parent if implemented that way, or we can add a clearSelection callback
                }
                if (isToolbarOpen) {
                    onToggleToolbar();
                }
                event.preventDefault();
                return;
            }

            // Allow Alt+Key shortcuts to work even in inputs
            // Also allow Escape to work in inputs (unless prevented by the input itself)
            if ((event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
                if (event.key === 'Escape') {
                    // If the input handled it (e.g. cleared text), it should have prevented default.
                    // If not, we let it bubble to our handler below.
                    if (event.defaultPrevented) return;
                } else if (!event.altKey) {
                    return;
                }
            }

            let shouldPreventDefault = false;

            switch (event.key) {
                case 'Enter':
                    if (selectedNodeIds.length === 1 || selectedLinkId) {
                        onOpenPropertiesPanel();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'Tab':
                    if (nodes.length > 0 && !isPanelOpen) {
                        const getNodePosition = (node: Node) => {
                            if (showSlices) {
                                return swimlanePositions.get(node.id) || { x: node.x ?? 0, y: node.y ?? 0 };
                            }
                            return { x: node.fx ?? node.x ?? 0, y: node.fy ?? node.y ?? 0 };
                        };

                        const sortedNodes = [...nodes].sort((a, b) => {
                            const posA = getNodePosition(a);
                            const posB = getNodePosition(b);
                            if (posA.y !== posB.y) return posA.y - posB.y;
                            return posA.x - posB.x;
                        });

                        let currentIndex = -1;
                        if (selectedNodeIds.length === 1) {
                            currentIndex = sortedNodes.findIndex(n => n.id === selectedNodeIds[0]);
                        }

                        const nextIndex = event.shiftKey
                            ? (currentIndex - 1 + sortedNodes.length) % sortedNodes.length
                            : (currentIndex + 1) % sortedNodes.length;

                        const nextNode = sortedNodes[nextIndex];
                        if (nextNode) {
                            onSelectNode(nextNode);
                        }
                        shouldPreventDefault = true;
                    }
                    break;

                case 'Delete':
                case 'Backspace':
                    if (selectedNodeIds.length > 0 || selectedLinkId) {
                        onDeleteSelection();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'a': case 'A': case 'n': case 'N':
                    if (!(event.metaKey || event.ctrlKey)) {
                        if (isReady) onToggleToolbar();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'f': case 'F':
                    if (!(event.metaKey || event.ctrlKey)) {
                        onFocusNode();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
                    if (selectedNodeIds.length > 0 && !showSlices) {
                        const updates = new Map<string, { fx: number, fy: number }>();

                        let dx = 0, dy = 0;
                        if (event.key === 'ArrowUp') dy = -GRID_SIZE;
                        if (event.key === 'ArrowDown') dy = GRID_SIZE;
                        if (event.key === 'ArrowLeft') dx = -GRID_SIZE;
                        if (event.key === 'ArrowRight') dx = GRID_SIZE;

                        if (dx !== 0 || dy !== 0) {
                            nodes.forEach(node => {
                                if (selectedNodeIds.includes(node.id)) {
                                    const currentX = node.fx ?? node.x ?? 0;
                                    const currentY = node.fy ?? node.y ?? 0;
                                    const newPos = { fx: currentX + dx, fy: currentY + dy };
                                    updates.set(node.id, newPos);
                                }
                            });
                            onMoveNodes(updates);
                            shouldPreventDefault = true;
                        }
                    }
                    break;

                case 's': case 'S':
                    if (event.altKey) {
                        onOpenSlices?.();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'd': case 'D':
                    if (event.altKey) {
                        onOpenDictionary?.();
                        shouldPreventDefault = true;
                    }
                    break;

                case 'p': case 'P':
                    if (event.altKey) {
                        onOpenPropertiesPanel();
                        shouldPreventDefault = true;
                    }
                    break;
            }

            // Undo/Redo
            if ((event.metaKey || event.ctrlKey) && (event.key === 'z' || event.key === 'Z')) {
                if (event.shiftKey) {
                    onRedo();
                } else {
                    onUndo();
                }
                shouldPreventDefault = true;
            }

            if ((event.metaKey || event.ctrlKey) && (event.key === 'y' || event.key === 'Y')) {
                onRedo();
                shouldPreventDefault = true;
            }

            if (isToolbarOpen) {
                const tools = [ElementType.Screen, ElementType.Command, ElementType.EventInternal, ElementType.ReadModel, ElementType.EventExternal, ElementType.Automation];
                const keyIndex = parseInt(event.key, 10) - 1;
                if (keyIndex >= 0 && keyIndex < tools.length) {
                    onAddNode(tools[keyIndex]);
                    shouldPreventDefault = true;
                }
            }

            if (shouldPreventDefault) event.preventDefault();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        nodes, selectedNodeIds, selectedLinkId, isPanelOpen, isToolbarOpen, isReady,
        showSlices, swimlanePositions, onDeleteSelection, onClosePanel, onToggleToolbar,
        onOpenPropertiesPanel, onOpenSlices, onOpenDictionary, onSelectNode, onAddNode, onMoveNodes, onFocusNode,
        onUndo, onRedo
    ]);
}
