import React, { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    ElementType,
    Node,
    Link
} from '../domain/types';
import { calculateNodeHeight } from '../domain/textUtils';
import { default as validationService } from '../domain/validation';
import { ModelingEvent } from '../domain/events';
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
        addSlice,
        updateSlice,
        deleteSlice,
        updateEdgeRoutes,
        unpinNode,
        unpinAllNodes,
        updateNodePositionsBatch: gunUpdateNodePositionsBatch,
        modelName,
        updateModelName
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
            type: ModelingEvent.NodeAdded,
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
            type: ModelingEvent.NodeDeleted,
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
            type: key === 'name' ? ModelingEvent.NodeRenamed : ModelingEvent.NodeUpdated,
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
            type: ModelingEvent.LinkUpdated,
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
            type: ModelingEvent.LinkAdded,
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
            type: ModelingEvent.LinkDeleted,
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
        const batchUpdates: { id: string, x: number, y: number }[] = [];
        let shouldTriggerLayout = false;

        updates.forEach(({ nodeId, pos }) => {
            batchUpdates.push({ id: nodeId, x: pos.x, y: pos.y });
            if (manualPositionsRef.current) {
                manualPositionsRef.current.set(nodeId, pos);
            }

            // Optimization: Only trigger layout if the moved node has connections
            if (!shouldTriggerLayout) {
                const hasConnections = links.some(l => l.source === nodeId || l.target === nodeId);
                if (hasConnections) shouldTriggerLayout = true;
            }
        });

        if (batchUpdates.length > 0) {
            gunUpdateNodePositionsBatch(batchUpdates);
        }

        if (edgeRoutesMap && edgeRoutesMap.size > 0) {
            updateEdgeRoutes(new Map());
        }

        if (shouldTriggerLayout) {
            // Debounce layout trigger for drags
            const timer = setTimeout(() => {
                onRequestAutoLayout?.();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [gunUpdateNodePositionsBatch, manualPositionsRef, edgeRoutesMap, updateEdgeRoutes, onRequestAutoLayout, links]);

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
        signal("Node.Unpinned", { id });
        onRequestAutoLayout?.();
    }, [unpinNode, onRequestAutoLayout, signal]);

    const handleUnpinAllNodes = useCallback(() => {
        unpinAllNodes();
        signal("Node.UnpinnedAll");
        onRequestAutoLayout?.();
    }, [unpinAllNodes, onRequestAutoLayout, signal]);

    const handleAddSlice = useCallback((title: string) => {
        signal("Slice.Added", { title });
        return addSlice(title, slices.length);
    }, [addSlice, slices.length, signal]);

    const handlePinSelection = useCallback(() => {
        selectedNodeIdsArray.forEach(id => handleUpdateNode(id, 'pinned', true));
        signal("Selection.Pinned", { count: selectedNodeIdsArray.length });
    }, [selectedNodeIdsArray, handleUpdateNode, signal]);

    const handleUnpinSelection = useCallback(() => {
        selectedNodeIdsArray.forEach(id => unpinNode(id));
        signal("Selection.Unpinned", { count: selectedNodeIdsArray.length });
        onRequestAutoLayout?.();
    }, [selectedNodeIdsArray, unpinNode, onRequestAutoLayout, signal]);

    const handlePasteNodes = useCallback((nodesData: Node[]) => {
        if (!modelId || nodesData.length === 0) return;

        const GRID_SIZE = 20;
        const newSelectionIds: string[] = [];

        nodesData.forEach(node => {
            const newId = uuidv4();
            const x = (node.x || 0) + GRID_SIZE;
            const y = (node.y || 0) + GRID_SIZE;

            // Replicate the node with valid properties for a new instance
            // Omit system-managed fields like id, timestamp, etc. if pertinent
            gunAddNode(node.type, x, y, newId);

            // Also copy other properties like name, description, etc.
            // gunAddNode only sets basic props. We need to update the rest.
            const updates: Partial<Node> = {
                name: `${node.name}`,
                description: node.description,
                // Copy Strict Mode props
                service: node.service,
                aggregate: node.aggregate,
                context: node.context,
                technicalTimestamp: node.technicalTimestamp,
                fields: node.fields,
                // Do NOT copy sliceId or fixed position (unless we want to pin it exactly offset?)
                // Usually pasting implies "new instance", so maybe unpinned?
                // Plan said "Offsets positions", implies manual pos unless auto layout.
                // If the original was fixed, let's keep it fixed (pinned) but offset.
                fx: node.fx !== undefined && node.fx !== null ? node.fx + GRID_SIZE : undefined,
                fy: node.fy !== undefined && node.fy !== null ? node.fy + GRID_SIZE : undefined,
                pinned: node.pinned
            };

            gunUpdateNode(newId, updates);
            newSelectionIds.push(newId);

            addToHistory({
                type: ModelingEvent.NodeAdded,
                payload: { id: newId, type: node.type, x, y },
                undoPayload: { id: newId }
            });
        });

        // Auto-select the pasted nodes
        setSelection(newSelectionIds);
        signal("Nodes.Pasted", { count: newSelectionIds.length });
    }, [modelId, gunAddNode, gunUpdateNode, addToHistory, setSelection, signal]);

    const handleUndo = useCallback(() => {
        undo();
        signal("History.Undo");
    }, [undo, signal]);

    const handleRedo = useCallback(() => {
        redo();
        signal("History.Redo");
    }, [redo, signal]);

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
        addDefinition: (def: any) => {
            signal("Definition.Added", { name: def.name });
            return addDefinition(def);
        },
        updateDefinition: (id: string, def: any) => {
            updateDefinition(id, def);
            signal("Definition.Updated", { id });
        },
        deleteDefinition: (id: string) => {
            deleteDefinition(id);
            signal("Definition.Deleted", { id });
        },
        updateSlice,
        deleteSlice,
        updateEdgeRoutes,
        undo: handleUndo,
        redo: handleRedo,
        canUndo,
        canRedo,
        addToHistory,
        selectNode,
        selectLink,
        clearSelection,
        setSelection,
        gunUpdateNodePosition,
        gunUpdateNodePositionsBatch,
        unpinNode: handleUnpinNode,
        unpinAllNodes: handleUnpinAllNodes,
        modelName,
        updateModelName,
        handleAddSlice,
        handlePinSelection,
        handleUnpinSelection,
        pasteNodes: handlePasteNodes
    };
};
