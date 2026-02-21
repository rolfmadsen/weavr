import React, { useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    ElementType,
    Node,
    Link,
    Actor,
    DataDefinition,
    Slice,
    ViewState
} from '../domain/types';
import { calculateNodeHeight } from '../domain/textUtils';
import { default as validationService } from '../domain/validation';

import { useGraphSync } from '../../collaboration';
import { useSelection, type GraphCanvasKonvaRef } from '../../canvas';
import { bus } from '../../../shared/events/eventBus';

interface UseModelManagerProps {
    modelId: string | null;
    viewState: ViewState;
    signal: (name: string, metadata?: any) => void;
    setSidebarView: (view: 'properties' | 'slices' | 'dictionary' | 'actors' | null) => void;
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
        sliceBoundsMap,
        manualPositionsRef,
        updateEdgeRoutes,
        updateSliceBounds,
        modelName,
        actors
    } = useGraphSync(modelId || '');

    // Derived: Slices with nodes
    const slicesWithNodes = useMemo(() => {
        return slices.map(slice => ({
            ...slice,
            nodeIds: new Set(nodes.filter(n => n.sliceId === slice.id).map(n => n.id))
        }));
    }, [slices, nodes]);

    // Derived State: Orphaned Fields (fields in nodes not linked to any definition)
    const orphanedFields = useMemo(() => {
        const orphaned = new Map<string, { name: string, type: string, nodeIds: string[] }>();
        nodes.forEach(node => {
            if (!node.fields) return;
            node.fields.forEach(field => {
                if (!field.definitionId) {
                    const key = `${field.name}:${field.type}`;
                    const existing = orphaned.get(key);
                    if (existing) {
                        existing.nodeIds.push(node.id);
                    } else {
                        orphaned.set(key, {
                            name: field.name,
                            type: field.type,
                            nodeIds: [node.id]
                        });
                    }
                }
            });
        });
        return Array.from(orphaned.values());
    }, [nodes]);

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

        // EDA: Dispatch Command
        bus.emit('command:createNode', {
            id,
            type,
            x: viewportCenter.x,
            y: viewportCenter.y,
            pinned: true
        });
        // Auto-select and focus
        selectNode(id);
        setSidebarView('properties');
        setFocusOnRender(true);
        signal("Node.Added", { type, id });
    }, [modelId, viewState, selectNode, setSidebarView, setFocusOnRender, signal]);

    const handleLinkFieldToDefinition = useCallback((fieldName: string, fieldType: string, definitionId: string) => {
        // Find all nodes that have this orphaned field and update them
        nodes.forEach(node => {
            if (!node.fields) return;
            const fieldIndex = node.fields.findIndex(f => f.name === fieldName && f.type === fieldType && !f.definitionId);
            if (fieldIndex !== -1) {
                const newFields = [...node.fields];
                newFields[fieldIndex] = { ...newFields[fieldIndex], definitionId };
                bus.emit('command:updateNode', {
                    id: node.id,
                    changes: { fields: newFields }
                });
            }
        });
        signal("Field.Linked", { fieldName, definitionId });
    }, [nodes, signal]);

    const handleDeleteNode = useCallback((nodeId: string) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        // Find links to delete

        // EDA: Dispatch Command
        bus.emit('command:deleteNode', { id: nodeId });
        signal("Node.Deleted", { id: nodeId });
    }, [nodes, signal]);

    const handleUpdateNode = useCallback(<K extends keyof Node>(nodeId: string, key: K, value: Node[K]) => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        const updates: Partial<Node> = { [key]: value };
        if (key === 'name') {
            updates.computedHeight = calculateNodeHeight(value as string);
        }

        // EDA: Dispatch Command
        bus.emit('command:updateNode', { id: nodeId, changes: updates });

        // Trigger layout on structural changes (Name = size, Slice = partition, Pinned = layout participation)
        if (key === 'name' || key === 'sliceId' || key === 'pinned') {
            onRequestAutoLayout?.();
        }
    }, [nodes, onRequestAutoLayout]);

    const handleUpdateLink = useCallback(<K extends keyof Link>(linkId: string, key: K, value: Link[K]) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;
        const updates: Partial<Link> = { [key]: value };

        // EDA: Dispatch Command
        bus.emit('command:updateLink', { id: linkId, changes: updates });
    }, [links]);

    const handleAddLink = useCallback((sourceId: string, targetId: string) => {
        if (!modelId || sourceId === targetId) return;
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (!sourceNode || !targetNode) return;

        if (!validationService.isValidConnection(sourceNode, targetNode)) {
            signal("Link.Invalid", { source: sourceNode.type, target: targetNode.type });
            return;
        }


        // const newLink: Link = ...

        // EDA: Dispatch Command
        bus.emit('command:createLink', { sourceId, targetId });

        // Smart Unpin & Slice Association:
        // If connecting a sliceless node to a sliced node:
        // 1. Unpin it (so it layouts automatically)
        // 2. Assign it to the target's slice
        if (!sourceNode.sliceId && targetNode.sliceId) {
            bus.emit('command:updateNode', {
                id: sourceId,
                changes: { pinned: false, sliceId: targetNode.sliceId }
            });
        }
        else if (!targetNode.sliceId && sourceNode.sliceId) {
            bus.emit('command:updateNode', {
                id: targetId,
                changes: { pinned: false, sliceId: sourceNode.sliceId }
            });
        }
        // Fallback: If both are sliceless and one is pinned? (Keep existing behavior: user manages)
        // Existing "just unpin" logic was:
        /*
        if (sourceNode.pinned && !sourceNode.sliceId && targetNode.sliceId) ...
        */
        // My new logic covers this because !sourceNode.sliceId covers pinned OR unpinned.
        // If it was pinned, it gets unpinned + slice. If it was unpinned, it stays unpinned + slice.

        signal("Link.Added", { sourceId, targetId });
        onRequestAutoLayout?.();
    }, [modelId, nodes, signal, onRequestAutoLayout]);

    const handleDeleteLink = useCallback((linkId: string) => {
        const link = links.find(l => l.id === linkId);
        if (!link) return;

        // EDA: Dispatch Command
        bus.emit('command:deleteLink', { id: linkId });
        signal("Link.Deleted", { id: linkId });
    }, [links, signal]);

    const handleDeleteSelection = useCallback(() => {
        if (selectedNodeIds.length > 0) {
            selectedNodeIds.forEach(id => handleDeleteNode(id));
            clearSelection();
        } else if (selectedLinkId) {
            handleDeleteLink(selectedLinkId);
            clearSelection();
        }
    }, [selectedNodeIds, selectedLinkId, handleDeleteNode, handleDeleteLink, clearSelection]);



    const handleNodeClick = useCallback((nodeId: string, multi: boolean = false) => {
        selectNode(nodeId, multi);
    }, [selectNode]);

    const handleLinkClick = useCallback((linkId: string) => {
        selectLink(linkId);
    }, [selectLink]);

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



    const handleUnpinAllNodes = useCallback(() => {
        const allIds = nodes.map(n => n.id);
        bus.emit('command:unpinNodes', { ids: allIds });
        onRequestAutoLayout?.();
    }, [nodes, onRequestAutoLayout]);

    const handleAddSlice = useCallback((title: string) => {
        signal("Slice.Added", { title });
        const id = uuidv4();
        // EDA: Dispatch
        // But App.tsx `handleAddSliceInternal` uses the ID to highlight/open the slice manager.
        // HACK: I will revert to calling `addSlice` (legacy) for NOW for slices to avoid breaking App.tsx flow,
        // OR I update App.tsx. 
        // Better: I generated ID in App.tsx! `const id = uuidv4(); updateSlice(id, ...)`
        // Wait, App.tsx calls `handleAddSliceInternal` which calls `updateSlice`(context) 
        // BUT `useModelManager` exposes `addSlice`? 
        // Let's re-read App.tsx lines 365.
        // `handleAddSliceInternal` calls `updateSlice` (from useModelManager destructure).
        bus.emit('command:createSlice', { title, order: slices.length, id });
        return id;
    }, [slices.length, signal]);

    const handlePinSelection = useCallback(() => {
        bus.emit('command:pinNodes', { ids: selectedNodeIdsArray });
    }, [selectedNodeIdsArray]);

    const handleUnpinSelection = useCallback(() => {
        bus.emit('command:unpinNodes', { ids: selectedNodeIdsArray });
        onRequestAutoLayout?.();
    }, [selectedNodeIdsArray, onRequestAutoLayout]);

    const handlePasteNodes = useCallback((nodesData: Node[]) => {
        if (!modelId || nodesData.length === 0) return;

        const GRID_SIZE = 20;
        const newSelectionIds: string[] = [];

        nodesData.forEach(node => {
            const newId = uuidv4();
            const x = (node.x || 0) + GRID_SIZE;
            const y = (node.y || 0) + GRID_SIZE;

            const updates: Partial<Node> = {
                name: `${node.name}`,
                description: node.description,
                service: node.service,
                aggregate: node.aggregate,
                context: node.context,
                technicalTimestamp: node.technicalTimestamp,
                fields: node.fields,
                fx: node.fx !== undefined && node.fx !== null ? node.fx + GRID_SIZE : undefined,
                fy: node.fy !== undefined && node.fy !== null ? node.fy + GRID_SIZE : undefined,
                pinned: node.pinned
            };

            // EDA: Use event bus for update
            // Create then Update
            bus.emit('command:createNode', { id: newId, type: node.type, x, y, sliceId: node.sliceId });
            bus.emit('command:updateNode', { id: newId, changes: updates });
            newSelectionIds.push(newId);
        });

        // Auto-select the pasted nodes
        setSelection(newSelectionIds);
        signal("Nodes.Pasted", { count: newSelectionIds.length });
    }, [modelId, setSelection, signal]);


    const addActor = useCallback((actor: { name: string; description: string; color: string }) => {
        const id = uuidv4();
        bus.emit('command:createActor', { ...actor, id });
        signal("Actor.Added", { name: actor.name });
        return id;
    }, [signal]);

    const updateActor = useCallback((id: string, changes: Partial<Actor>) => {
        bus.emit('command:updateActor', { id, changes });
    }, []);

    const deleteActor = useCallback((id: string) => {
        bus.emit('command:deleteActor', { id });
        signal("Actor.Deleted", { id });
    }, [signal]);

    return {
        nodes,
        links,
        slices,
        slicesWithNodes,
        definitions,
        orphanedFields,
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

        handleNodeClick,
        handleLinkClick,
        handleNodeDoubleClick,
        handleLinkDoubleClick,
        handleMarqueeSelect,
        handleFocusNode,
        handleClosePanel,
        addDefinition: (def: Omit<DataDefinition, 'id'> & { id?: string }) => {
            console.log('[ModelManager] addDefinition called:', def);
            signal("Definition.Added", { name: def.name });
            const id = def.id || uuidv4();
            bus.emit('command:createDefinition', {
                id,
                name: def.name,
                type: def.type,
                description: def.description,
                attributes: def.attributes,
                parentId: def.parentId,
                isRoot: !!def.isRoot
            });
            return id;
        },
        updateDefinition: (id: string, changes: Partial<DataDefinition>) => {
            console.log('[ModelManager] updateDefinition called:', { id, changes });
            bus.emit('command:updateDefinition', { id, changes });
        },
        deleteDefinition: (id: string) => {
            bus.emit('command:deleteDefinition', { id });
            signal("Definition.Deleted", { id });
        },
        handleLinkFieldToDefinition,
        updateSlice: (id: string, changes: Partial<Slice>) => {
            bus.emit('command:updateSlice', { id, changes });
        },
        deleteSlice: (id: string) => {
            bus.emit('command:deleteSlice', { id });
        },
        updateEdgeRoutes,
        selectNode,
        selectLink,
        clearSelection,
        setSelection,

        unpinAllNodes: handleUnpinAllNodes,
        modelName,
        updateModelName: (name: string) => {
            bus.emit('command:updateModelName', { name });
        },
        handleAddSlice,
        handlePinSelection,
        handleUnpinSelection,
        pasteNodes: handlePasteNodes,
        updateSliceBounds,
        sliceBoundsMap,
        actors,
        addActor,
        updateActor,
        deleteActor
    };
};
