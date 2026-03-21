import { useEffect, useRef } from 'react';
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
    onOpenActors?: () => void;
    onSelectNode: (node: Node, event?: any) => void;
    onAddNode: (type: ElementType) => void;
    onMoveNodes: (updates: Map<string, { fx: number, fy: number }>) => void;
    onFocusNode: (id?: string) => void;
    onAutoLayout: () => void;
    onPaste: (nodes: Node[]) => void;
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
    onOpenActors,
    onSelectNode,
    onAddNode,
    onMoveNodes,
    onFocusNode,
    onAutoLayout,
    onPaste,
    onSelectAll,
    onDuplicate,
    onZoomIn,
    onZoomOut,
    onResetZoom
}: UseKeyboardShortcutsProps & {
    onSelectAll?: () => void;
    onDuplicate?: () => void;
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onResetZoom?: () => void;
}) {

    // Throttle for arrow key holding
    const lastArrowMoveRef = useRef<number>(0);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // [UX Fix] If focused on an input/textarea, we must prevent our global 
            // shortcuts (like Ctrl+A, Ctrl+C, Ctrl+D) from shadowing browser-native 
            // text editing. We only allow specific navigation-level shortcuts (Alt+Key).
            const isInput =
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                (event.target instanceof HTMLElement && (event.target as any).isContentEditable);

            if (isInput) {
                // Always allow Escape to fall through so it can clear selection or close panels
                if (event.key === 'Escape') {
                    // Check below at line 86
                } 
                // ONLY proceed for Alt-shortcuts (e.g. Alt+1 for tabs, Alt+S for Slices)
                // We exclude Ctrl/Meta to allow native Select All (Ctrl+A), Copy/Paste, etc.
                else if (event.altKey && !event.ctrlKey && !event.metaKey) {
                    // Proceed to switch statement below
                } 
                else {
                    // Let the browser handle everything else (Ctrl+A, Backspace, Arrows, etc)
                    return;
                }
            }

            if (event.key === 'Escape') {
                // Allow inputs to handle Escape themselves (e.g. ElementFilter)
                if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
                    return;
                }

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

            let shouldPreventDefault = false;

            // Handle Key Combinations (Ctrl/Cmd)
            if (event.metaKey || event.ctrlKey) {

                switch (event.key.toLowerCase()) {
                    case 'a':
                        onSelectAll?.();
                        shouldPreventDefault = true;
                        break;
                    case 'd':
                        onDuplicate?.();
                        shouldPreventDefault = true;
                        break;
                    case 'c':
                        if (selectedNodeIds.length > 0) {
                            const nodesToCopy = nodes.filter(n => selectedNodeIds.includes(n.id));
                            const clipboardData = {
                                weavr_type: 'nodes',
                                data: nodesToCopy
                            };
                            navigator.clipboard.writeText(JSON.stringify(clipboardData));
                            shouldPreventDefault = true;
                        }
                        break;
                    case 'v':
                        navigator.clipboard.readText().then(text => {
                            try {
                                const parsed = JSON.parse(text);
                                if (parsed && parsed.weavr_type === 'nodes' && Array.isArray(parsed.data)) {
                                    onPaste(parsed.data);
                                }
                            } catch (e) {
                                // Not valid JSON or not our format
                            }
                        });
                        shouldPreventDefault = true;
                        break;
                    case '+':
                    case '=':
                        onZoomIn?.();
                        shouldPreventDefault = true;
                        break;
                    case '-':
                    case '_':
                        onZoomOut?.();
                        shouldPreventDefault = true;
                        break;
                    case '0':
                        onResetZoom?.();
                        shouldPreventDefault = true;
                        break;
                }
            } else {
                // Single keystrokes without Ctrl/Cmd
                switch (event.key) {
                    case 'Enter':
                        // Don't trigger if the user is focused on an interactive element
                        if (event.target instanceof HTMLElement && event.target.matches('button, a, summary, [role="button"], [role="link"], [role="tab"], input, textarea, select')) {
                            break;
                        }

                        if (selectedNodeIds.length === 1 || selectedLinkId) {
                            onOpenPropertiesPanel();
                            // Only prevent default if we actually handled it (i.e., we are not on an interactive element)
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
                        if (isReady) onToggleToolbar();
                        shouldPreventDefault = true;
                        break;

                    case 'f': case 'F':
                        if (selectedNodeIds.length > 0) {
                            onFocusNode(selectedNodeIds[0]);
                            shouldPreventDefault = true;
                        }
                        break;

                    case 'l': case 'L':
                        onAutoLayout();
                        shouldPreventDefault = true;
                        break;

                    case 'ArrowUp': case 'ArrowDown': case 'ArrowLeft': case 'ArrowRight':
                        if (selectedNodeIds.length > 0 && !showSlices) {
                            const now = Date.now();
                            if (event.repeat && now - lastArrowMoveRef.current < 50) {
                                // Throttle to roughly 20 moves per second while holding
                                shouldPreventDefault = true;
                                break;
                            }
                            lastArrowMoveRef.current = now;

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
                                        // Snap to grid
                                        const newPos = {
                                            fx: Math.round((currentX + dx) / GRID_SIZE) * GRID_SIZE,
                                            fy: Math.round((currentY + dy) / GRID_SIZE) * GRID_SIZE
                                        };
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
                    
                    case '1':
                        if (event.altKey) {
                            onOpenPropertiesPanel();
                            shouldPreventDefault = true;
                        }
                        break;
                    case '2':
                        if (event.altKey) {
                            onOpenDictionary?.();
                            shouldPreventDefault = true;
                        }
                        break;
                    case '3':
                        if (event.altKey) {
                            onOpenSlices?.();
                            shouldPreventDefault = true;
                        }
                        break;
                    case '4':
                        if (event.altKey) {
                            (onOpenActors as any)?.();
                            shouldPreventDefault = true;
                        }
                        break;
                }
            }


            if (isToolbarOpen) {
                const tools = [ElementType.Screen, ElementType.Command, ElementType.DomainEvent, ElementType.ReadModel, ElementType.IntegrationEvent, ElementType.Automation];
                const keyIndex = parseInt(event.key, 10) - 1;
                if (keyIndex >= 0 && keyIndex < tools.length) {
                    onAddNode(tools[keyIndex]);
                    shouldPreventDefault = true;
                }
            }


            if (shouldPreventDefault) {
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }, [
        nodes, selectedNodeIds, selectedLinkId, isPanelOpen, isToolbarOpen, isReady,
        showSlices, swimlanePositions, onDeleteSelection, onClosePanel, onToggleToolbar,
        onOpenPropertiesPanel, onOpenSlices, onOpenDictionary, onSelectNode, onAddNode, onMoveNodes, onFocusNode,
        onAutoLayout, onPaste, onSelectAll, onDuplicate, onZoomIn, onZoomOut, onResetZoom
    ]);
}
