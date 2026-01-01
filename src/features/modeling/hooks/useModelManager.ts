import React, { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    ElementType,
    Node,
    Link,
    calculateNodeHeight,
    validationService
} from '../index';
import { useGraphSync, useHistory } from '../../collaboration';
import { useSelection, type GraphCanvasKonvaRef } from '../../canvas';

interface UseModelManagerProps {
    modelId: string | null;
    viewState: any;
    signal: (name: string, metadata?: any) => void;
    setSidebarView: (view: 'properties' | 'slices' | 'dictionary' | null) => void;
    setFocusOnRender: (focus: boolean) => void;
    graphRef: React.RefObject<GraphCanvasKonvaRef | null>;
    setIsToolbarOpen: (open: boolean) => void;
    onRequestAutoLayout: () => void;
}

export const useModelManager = ({
    modelId,
    viewState,
    signal,
    setSidebarView,
    setFocusOnRender,
    graphRef,
    onRequestAutoLayout
}: UseModelManagerProps) => {
    const {
        nodes,
        links,
        slices,
        definitions,
        isReady,
        edgeRoutesMap,
        manualPositionsRef,
        addNode: gunAddNode,
        deleteNode: gunDeleteNode,
        updateNode: gunUpdateNode,
        addLink: gunAddLink,
        deleteLink: gunDeleteLink,
        updateLink: gunUpdateLink,
        updateNodePosition: gunUpdateNodePosition,
        addDefinition,
        updateDefinition,
        deleteDefinition,
        updateSlice,
        deleteSlice,
        updateEdgeRoutes,
        unpinNode,
        unpinAllNodes
    } = useGraphSync(modelId || '');

    // Derived: Slices with nodes
    const slicesWithNodes = useMemo(() => {
        return slices.map(slice => ({
            ...slice,
            nodeIds: new Set(nodes.filter(n => n.sliceId === slice.id).map(n => n.id))
        }));
    }, [slices, nodes]);

    const {
        undo,
        redo,
        canUndo,
        canRedo,
        addToHistory
    } = useHistory({
        onAddNode: (type, x, y, id) => gunAddNode(type, x, y, id),
        onDeleteNode: (id) => gunDeleteNode(id),
        onUpdateNode: (id, data) => gunUpdateNode(id, data),
        onAddLink: (s, t, l, id) => gunAddLink(s, t, l, id),
        onDeleteLink: (id) => gunDeleteLink(id),
        onUpdateLink: (id, data) => gunUpdateLink(id, data),
        onMoveNode: (id, x, y) => gunUpdateNodePosition(id, x, y)
    });

    const {
        selectedNodeIds,
        selectedLinkId,
        selectNode,
        selectLink,
        clearSelection,
        setSelection
    } = useSelection();

    const selectedNodeIdsArray = useMemo(() => Array.from(selectedNodeIds), [selectedNodeIds]);

    const handleAddNode = useCallback((type: ElementType) => {
        if (!modelId) return;
        const id = uuidv4();
        const viewportCenter = {
            x: (-viewState.x + window.innerWidth / 2) / viewState.scale,
            y: (-viewState.y + window.innerHeight / 2) / viewState.scale
        };

        gunAddNode(type, viewportCenter.x, viewportCenter.y, id);

        addToHistory({
            type: 'ADD_NODE',
            payload: { id, type, x: viewportCenter.x, y: viewportCenter.y },
            undoPayload: { id }
        });

        // Auto-select and focus
        selectNode(id);
        setSidebarView('properties');
        setFocusOnRender(true);
        signal("Node.Added", { type, id });
    }, [modelId, viewState, gunAddNode, addToHistory, selectNode, setSidebarView, setFocusOnRender, signal]);

    const handleDeleteNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        // Find links to delete
        const linkedLinks = links.filter(l => l.source === nodeId || l.target === nodeId);

        gunDeleteNode(nodeId);
        addToHistory({
            type: 'DELETE_NODE',
            payload: { id: nodeId },
            undoPayload: { node, links: linkedLinks }
        });
        signal("Node.Deleted", { id: nodeId });
    }, [nodes, links, gunDeleteNode, addToHistory, signal]);

    const handleUpdateNode = useCallback(<K extends keyof Node>(nodeId: string, key: K, value: Node[K]) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const updates: Partial<Node> = { [key]: value };
        if (key === 'name') {
            updates.computedHeight = calculateNodeHeight(value as string);
        }

        gunUpdateNode(nodeId, updates);

        // Simplified undo payload for brevity as per history service expectation
        addToHistory({
            type: 'UPDATE_NODE',
            payload: { id: nodeId, data: updates },
            undoPayload: { [key]: node[key] } as any
        });

        // Trigger layout on structural changes (Name = size, Slice = partition)
        if (key === 'name' || key === 'sliceId') {
            onRequestAutoLayout?.();
        }
    }, [nodes, gunUpdateNode, addToHistory, onRequestAutoLayout]);

    const handleUpdateLink = useCallback(<K extends keyof Link>(linkId: string, key: K, value: Link[K]) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;
        const updates: Partial<Link> = { [key]: value };

        gunUpdateLink(linkId, updates);

        addToHistory({
            type: 'UPDATE_LINK',
            payload: { id: linkId, data: updates },
            undoPayload: { [key]: link[key] } as any
        });
    }, [links, gunUpdateLink, addToHistory]);

    const handleAddLink = useCallback((sourceId: string, targetId: string) => {
        if (!modelId || sourceId === targetId) return;
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (!sourceNode || !targetNode) return;

        if (!validationService.isValidConnection(sourceNode, targetNode)) {
            signal("Link.Invalid", { source: sourceNode.type, target: targetNode.type });
            return;
        }

        const id = uuidv4();
        const newLink: Link = { id, source: sourceId, target: targetId, label: '' };

        gunAddLink(sourceId, targetId, '', id);

        addToHistory({
            type: 'ADD_LINK',
            payload: newLink,
            undoPayload: { id }
        });

        // Smart Unpin: If connecting a pinned, sliceless node to a sliced node, unpin it (pull into layout)
        if (sourceNode.pinned && !sourceNode.sliceId && targetNode.sliceId) {
            unpinNode(sourceId);
        }
        if (targetNode.pinned && !targetNode.sliceId && sourceNode.sliceId) {
            unpinNode(targetId);
        }

        signal("Link.Added", { sourceId, targetId });
        onRequestAutoLayout?.();
    }, [modelId, nodes, gunAddLink, addToHistory, signal, onRequestAutoLayout, unpinNode]);

    const handleDeleteLink = useCallback((linkId: string) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;
        gunDeleteLink(linkId);
        addToHistory({
            type: 'DELETE_LINK',
            payload: { id: linkId },
            undoPayload: link
        });
        signal("Link.Deleted", { id: linkId });
    }, [links, gunDeleteLink, addToHistory, signal]);

    const handleDeleteSelection = useCallback(() => {
        if (selectedNodeIds.length > 0) {
            selectedNodeIds.forEach(id => handleDeleteNode(id));
            clearSelection();
        } else if (selectedLinkId) {
            handleDeleteLink(selectedLinkId);
            clearSelection();
        }
    }, [selectedNodeIds, selectedLinkId, handleDeleteNode, handleDeleteLink, clearSelection]);

    const handleNodesDrag = useCallback((updates: { nodeId: string; pos: { x: number; y: number } }[]) => {
        let shouldTriggerLayout = false;

        updates.forEach(({ nodeId, pos }) => {
            gunUpdateNodePosition(nodeId, pos.x, pos.y);
            if (manualPositionsRef.current) {
                manualPositionsRef.current.set(nodeId, pos);
            }

            // Optimization: Only trigger layout if the moved node has connections
            if (!shouldTriggerLayout) {
                const hasConnections = links.some(l => l.source === nodeId || l.target === nodeId);
                if (hasConnections) shouldTriggerLayout = true;
            }
        });

        if (edgeRoutesMap && edgeRoutesMap.size > 0) {
            updateEdgeRoutes(new Map());
        }

        if (shouldTriggerLayout) {
            onRequestAutoLayout?.();
        }
    }, [gunUpdateNodePosition, manualPositionsRef, edgeRoutesMap, updateEdgeRoutes, onRequestAutoLayout, links]);

    const handleNodeClick = useCallback((nodeId: string, multi: boolean = false) => {
        selectNode(nodeId, multi);
        signal("Node.Clicked", { id: nodeId, multi });
    }, [selectNode, signal]);

    const handleLinkClick = useCallback((linkId: string) => {
        selectLink(linkId);
        signal("Link.Clicked", { id: linkId });
    }, [selectLink, signal]);

    const handleNodeDoubleClick = useCallback((nodeId: string) => {
        selectNode(nodeId);
        setSidebarView('properties');
        setFocusOnRender(true);
    }, [selectNode, setSidebarView, setFocusOnRender]);

    const handleLinkDoubleClick = useCallback((linkId: string) => {
        selectLink(linkId);
        setSidebarView('properties');
        setFocusOnRender(true);
    }, [selectLink, setSidebarView, setFocusOnRender]);

    const handleMarqueeSelect = useCallback((nodeIds: string[]) => {
        setSelection(nodeIds);
    }, [setSelection]);

    const handleFocusNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            graphRef.current?.panToNode?.(nodeId);
            selectNode(nodeId);
        }
    }, [nodes, graphRef, selectNode]);

    const handleClosePanel = useCallback(() => {
        setSidebarView(null);
        clearSelection();
    }, [setSidebarView, clearSelection]);

    const handleUnpinNode = useCallback((id: string) => {
        unpinNode(id);
        onRequestAutoLayout?.();
    }, [unpinNode, onRequestAutoLayout]);

    const handleUnpinAllNodes = useCallback(() => {
        unpinAllNodes();
        onRequestAutoLayout?.();
    }, [unpinAllNodes, onRequestAutoLayout]);

    // ...

    return {
        nodes,
        links,
        slices,
        slicesWithNodes,
        definitions,
        isReady,
        edgeRoutesMap,
        manualPositionsRef,
        selectedNodeIds,
        selectedNodeIdsArray,
        selectedLinkId,
        handleAddNode,
        handleDeleteNode,
        handleUpdateNode,
        handleUpdateLink,
        handleAddLink,
        handleDeleteLink,
        handleDeleteSelection,
        handleNodesDrag,
        handleNodeClick,
        handleLinkClick,
        handleNodeDoubleClick,
        handleLinkDoubleClick,
        handleMarqueeSelect,
        handleFocusNode,
        handleClosePanel,
        addDefinition,
        updateDefinition,
        deleteDefinition,
        updateSlice,
        deleteSlice,
        updateEdgeRoutes,
        undo,
        redo,
        canUndo,
        canRedo,
        addToHistory,
        selectNode,
        selectLink,
        clearSelection,
        setSelection,
        gunUpdateNodePosition,
        unpinNode: handleUnpinNode,
        unpinAllNodes: handleUnpinAllNodes
    };
};
