import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import gunClient from '../services/gunClient';
import { Node, Link, ElementType, Slice, DataDefinition, DefinitionType } from '../../modeling';


export function useGraphSync(modelId: string | null) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [slices, setSlices] = useState<Slice[]>([]);
    const [definitions, setDefinitions] = useState<DataDefinition[]>([]);

    const [isReady, setIsReady] = useState(false);

    // Refs for DB state accumulation (Source of Truth for the subscription)
    const tempNodesRef = useRef(new Map<string, Node>());
    const tempLinksRef = useRef(new Map<string, Link>());
    const tempSlicesRef = useRef(new Map<string, Slice>());
    const tempDefinitionsRef = useRef(new Map<string, DataDefinition>());

    // We keep manual positions in a ref to avoid re-rendering on every drag frame,
    // but we also sync them to Gun.
    const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());

    // Ref to track current nodes state for merging partial updates
    const nodesRef = useRef<Node[]>([]);

    // Ref to track current links state for merging partial updates
    const linksRef = useRef<Link[]>([]);

    // Ref to track current slices state for merging partial updates
    const slicesRef = useRef<Slice[]>([]);

    // Ref to track current definitions state for merging partial updates
    const definitionsRef = useRef<DataDefinition[]>([]);

    // Sync nodesRef, linksRef, slicesRef, definitionsRef with state
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        linksRef.current = links;
    }, [links]);

    useEffect(() => {
        slicesRef.current = slices;
    }, [slices]);

    useEffect(() => {
        definitionsRef.current = definitions;
    }, [definitions]);

    useEffect(() => {
        if (!modelId) return;

        // Clear refs on new model to prevent stale data
        tempNodesRef.current.clear();
        tempLinksRef.current.clear();
        tempSlicesRef.current.clear();
        tempDefinitionsRef.current.clear();
        manualPositionsRef.current.clear();

        const model = gunClient.getModel(modelId);

        // ------------------------------------------------------------
        // PERFORMANCE OPTIMIZATION: BATCHING & DEBOUNCING
        // ------------------------------------------------------------
        // tempNodes, tempLinks, tempSlices are now refs: tempNodesRef, tempLinksRef, tempSlicesRef

        // Timers for debouncing the state updates
        let nodeUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let linkUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let sliceUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let definitionUpdateTimer: ReturnType<typeof setTimeout> | null = null;

        // 1. Subscribe to nodes
        model.get('nodes').map().on((nodeData: any, nodeId: string) => {
            try {
                if (nodeData === null) {
                    tempNodesRef.current.delete(nodeId);
                    manualPositionsRef.current.delete(nodeId);
                } else if (nodeData && typeof nodeData === 'object') {
                    // Try to find existing node in tempNodes OR in the current application state (nodesRef)
                    // This handles the case where we have an optimistic node that hasn't fully synced from DB yet,
                    // but we receive a partial update (like a drag) for it.
                    const existingNode = tempNodesRef.current.get(nodeId) || nodesRef.current.find(n => n.id === nodeId);

                    // We need either an existing node to merge into, OR a full node definition (type & name)
                    if (existingNode || (nodeData.type && nodeData.name)) {
                        const newNode: Node = {
                            id: nodeId,
                            type: nodeData.type || existingNode?.type,
                            name: nodeData.name || existingNode?.name,
                            description: nodeData.description !== undefined ? nodeData.description : (existingNode?.description || ''),
                            x: typeof nodeData.x === 'number' ? nodeData.x : existingNode?.x,
                            y: typeof nodeData.y === 'number' ? nodeData.y : existingNode?.y,
                            fx: typeof nodeData.fx === 'number' ? nodeData.fx : existingNode?.fx,
                            fy: typeof nodeData.fy === 'number' ? nodeData.fy : existingNode?.fy,
                            sliceId: nodeData.sliceId !== undefined ? nodeData.sliceId : existingNode?.sliceId,
                            schemaBinding: nodeData.schemaBinding !== undefined ? nodeData.schemaBinding : existingNode?.schemaBinding,
                            entityIds: nodeData.entityIds ? (typeof nodeData.entityIds === 'string' ? JSON.parse(nodeData.entityIds) : nodeData.entityIds) : (existingNode?.entityIds || []),
                        };

                        // Only set if we have the critical fields
                        if (newNode.type && newNode.name) {
                            if (newNode.fx != null && newNode.fy != null) {
                                manualPositionsRef.current.set(nodeId, { x: newNode.fx, y: newNode.fy });
                            }
                            tempNodesRef.current.set(nodeId, newNode);
                        }
                    }
                }


                if (nodeUpdateTimer) clearTimeout(nodeUpdateTimer);
                nodeUpdateTimer = setTimeout(() => {
                    setNodes(Array.from(tempNodesRef.current.values()));
                    nodeUpdateTimer = null;
                }, 50);

            } catch (err) {
                console.error(`Error processing node ${nodeId}:`, err);
            }
        });

        // 2. Subscribe to links
        model.get('links').map().on((linkData: any, linkId: string) => {
            try {
                if (linkData === null) {
                    tempLinksRef.current.delete(linkId);
                } else if (linkData && typeof linkData === 'object') {
                    const existingLink = tempLinksRef.current.get(linkId) || linksRef.current.find(l => l.id === linkId);

                    if (existingLink || (linkData.source && linkData.target)) {
                        const newLink: Link = {
                            id: linkId,
                            source: linkData.source || existingLink?.source,
                            target: linkData.target || existingLink?.target,
                            label: linkData.label !== undefined ? linkData.label : (existingLink?.label || ''),
                            type: linkData.type || existingLink?.type,
                        };

                        if (newLink.source && newLink.target) {
                            tempLinksRef.current.set(linkId, newLink);
                        }
                    }
                }

                if (linkUpdateTimer) clearTimeout(linkUpdateTimer);
                linkUpdateTimer = setTimeout(() => {
                    setLinks(Array.from(tempLinksRef.current.values()));
                    linkUpdateTimer = null;
                }, 50);

            } catch (err) {
                console.error(`Error processing link ${linkId}:`, err);
            }
        });

        // 3. Subscribe to slices
        model.get('slices').map().on((sliceData: any, sliceId: string) => {
            try {
                if (sliceData === null) {
                    tempSlicesRef.current.delete(sliceId);
                } else if (sliceData && typeof sliceData === 'object') {
                    // Merge with existing application state (slicesRef) to prevent optimistic updates from being clobbered
                    const existingSlice = tempSlicesRef.current.get(sliceId) || slicesRef.current.find(s => s.id === sliceId);

                    const newSlice: Slice = {
                        id: sliceId,
                        title: sliceData.title || existingSlice?.title || 'Untitled Slice',
                        order: typeof sliceData.order === 'number' ? sliceData.order : (existingSlice?.order || 0),
                        nodeIds: new Set(), // Will be populated by App.tsx or derived
                        color: sliceData.color || existingSlice?.color || '#e5e7eb', // Default gray
                    };
                    tempSlicesRef.current.set(sliceId, newSlice);
                }

                if (sliceUpdateTimer) clearTimeout(sliceUpdateTimer);
                sliceUpdateTimer = setTimeout(() => {
                    // Sort by order before setting state
                    const sortedSlices = Array.from(tempSlicesRef.current.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
                    setSlices(sortedSlices);
                    sliceUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing slice ${sliceId}:`, err);
            }
        });

        // 4. Subscribe to definitions
        model.get('definitions').map().on((defData: any, defId: string) => {
            try {
                if (defData === null) {
                    tempDefinitionsRef.current.delete(defId);
                } else if (defData && typeof defData === 'object') {
                    const existingDef = tempDefinitionsRef.current.get(defId) || definitionsRef.current.find(d => d.id === defId);

                    const newDef: DataDefinition = {
                        id: defId,
                        name: defData.name || existingDef?.name || defId,
                        type: (defData.type as DefinitionType) || existingDef?.type || DefinitionType.Entity,
                        description: defData.description !== undefined ? defData.description : (existingDef?.description || ''),
                        attributes: defData.attributes ? (typeof defData.attributes === 'string' ? JSON.parse(defData.attributes) : defData.attributes) : (existingDef?.attributes || []),
                    };
                    tempDefinitionsRef.current.set(defId, newDef);
                }

                if (definitionUpdateTimer) clearTimeout(definitionUpdateTimer);
                definitionUpdateTimer = setTimeout(() => {
                    setDefinitions(Array.from(tempDefinitionsRef.current.values()));
                    definitionUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing definition ${defId}:`, err);
            }
        });

        const readyTimer = setTimeout(() => setIsReady(true), 500);

        return () => {
            clearTimeout(readyTimer);
            if (nodeUpdateTimer) clearTimeout(nodeUpdateTimer);
            if (linkUpdateTimer) clearTimeout(linkUpdateTimer);
            if (sliceUpdateTimer) clearTimeout(sliceUpdateTimer);
            if (definitionUpdateTimer) clearTimeout(definitionUpdateTimer);
        };

    }, [modelId]);

    const addNode = useCallback((type: ElementType, x: number, y: number, id?: string, sliceId?: string) => {
        if (!modelId) return;
        const model = gunClient.getModel(modelId);
        const nodeId = id || uuidv4();

        const formattedTypeName = type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

        const newNodeData: any = {
            type,
            name: `New ${formattedTypeName}`,
            description: '',
            x: x,
            y: y,
            fx: x,
            fy: y,
            entityIds: [], // Initialize as array for local state
        };

        if (sliceId !== undefined) {
            newNodeData.sliceId = sliceId;
        }

        const newNode: Node = { id: nodeId, ...newNodeData };
        setNodes(prev => [...prev, newNode]); // Optimistic update
        nodesRef.current = [...nodesRef.current, newNode]; // Immediate ref update for subscription race condition
        tempNodesRef.current.set(nodeId, newNode); // Immediate DB cache update to prevent clobbering

        // Prepare data for Gun (stringify array)
        const gunData = { ...newNodeData, entityIds: JSON.stringify(newNodeData.entityIds) };
        model.get('nodes').get(nodeId).put(gunData);
        manualPositionsRef.current.set(nodeId, { x, y });
        return nodeId;
    }, [modelId]);

    const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
        if (!modelId) return;
        setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, ...updates } : node)));

        // Update temp ref
        const existing = tempNodesRef.current.get(nodeId);
        if (existing) {
            tempNodesRef.current.set(nodeId, { ...existing, ...updates });
        }

        // Sanitize updates for Gun: undefined -> null (to delete), keep others
        const sanitizedUpdates: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null; // Gun uses null to delete/unset
            } else if (key === 'entityIds' && Array.isArray(value)) {
                sanitizedUpdates[key] = JSON.stringify(value);
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        gunClient.getModel(modelId).get('nodes').get(nodeId).put(sanitizedUpdates);
    }, [modelId]);

    const deleteNode = useCallback((nodeId: string) => {
        if (!modelId) return;
        const model = gunClient.getModel(modelId);

        setNodes(prev => prev.filter(n => n.id !== nodeId)); // Optimistic update
        nodesRef.current = nodesRef.current.filter(n => n.id !== nodeId); // Immediate ref update
        tempNodesRef.current.delete(nodeId); // Immediate DB cache update
        manualPositionsRef.current.delete(nodeId);

        model.get('nodes').get(nodeId).put(null as any);
        links.forEach(link => {
            if (link.source === nodeId || link.target === nodeId) {
                model.get('links').get(link.id).put(null as any);
            }
        });
    }, [modelId, links]);

    const addLink = useCallback((sourceId: string, targetId: string, label: string, id?: string) => {
        if (!modelId) return;
        const linkId = id || uuidv4();
        const newLinkData: any = { source: sourceId, target: targetId, label: label || '' };

        const newLink: Link = { id: linkId, ...newLinkData };
        setLinks(prev => [...prev, newLink]); // Optimistic update
        linksRef.current = [...linksRef.current, newLink]; // Immediate ref update
        tempLinksRef.current.set(linkId, newLink); // Immediate DB cache update

        gunClient.getModel(modelId).get('links').get(linkId).put(newLinkData);
        return linkId;
    }, [modelId]);


    const updateLink = useCallback((linkId: string, updates: Partial<Link>) => {
        if (!modelId) return;
        setLinks(currentLinks => currentLinks.map(link => (link.id === linkId ? { ...link, ...updates } : link)));

        // Update temp ref
        const existing = tempLinksRef.current.get(linkId);
        if (existing) {
            tempLinksRef.current.set(linkId, { ...existing, ...updates });
        }

        // Sanitize updates
        const sanitizedUpdates: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null;
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        gunClient.getModel(modelId).get('links').get(linkId).put(sanitizedUpdates);
    }, [modelId]);

    const deleteLink = useCallback((linkId: string) => {
        if (!modelId) return;

        setLinks(prev => prev.filter(l => l.id !== linkId)); // Optimistic update
        linksRef.current = linksRef.current.filter(l => l.id !== linkId); // Immediate ref update
        tempLinksRef.current.delete(linkId); // Immediate DB cache update

        gunClient.getModel(modelId).get('links').get(linkId).put(null as any);
    }, [modelId]);


    const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
        if (!modelId) return;
        setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, x, y, fx: x, fy: y } : node)));

        // Update temp ref
        const existing = tempNodesRef.current.get(nodeId);
        if (existing) {
            tempNodesRef.current.set(nodeId, { ...existing, x, y, fx: x, fy: y });
        }

        manualPositionsRef.current.set(nodeId, { x, y });
        // Ensure numbers are valid
        const safeX = isNaN(x) ? 0 : x;
        const safeY = isNaN(y) ? 0 : y;
        gunClient.getModel(modelId).get('nodes').get(nodeId).put({ x: safeX, y: safeY, fx: safeX, fy: safeY });
    }, [modelId]);

    // --- Slice Management ---

    const addSlice = useCallback((title: string, order: number) => {
        if (!modelId) return;
        const sliceId = uuidv4();
        const newSliceData = { title: title || 'Untitled', order: order || 0, color: '#e5e7eb' }; // Default color

        const newSlice: Slice = { id: sliceId, ...newSliceData, nodeIds: new Set() };
        setSlices(prev => [...prev, newSlice].sort((a, b) => (a.order || 0) - (b.order || 0))); // Optimistic update
        slicesRef.current = [...slicesRef.current, newSlice].sort((a, b) => (a.order || 0) - (b.order || 0)); // Immediate ref update
        tempSlicesRef.current.set(sliceId, newSlice); // Immediate DB cache update

        gunClient.getModel(modelId).get('slices').get(sliceId).put(newSliceData);
        return sliceId;
    }, [modelId]);

    const updateSlice = useCallback((sliceId: string, updates: Partial<Slice>) => {
        if (!modelId) return;
        // Optimistic update
        setSlices(currentSlices => currentSlices.map(s => (s.id === sliceId ? { ...s, ...updates } : s)).sort((a, b) => (a.order || 0) - (b.order || 0)));

        // Update temp ref
        const existing = tempSlicesRef.current.get(sliceId);
        if (existing) {
            tempSlicesRef.current.set(sliceId, { ...existing, ...updates });
        }

        // Strip out non-storage fields if necessary, but Gun usually ignores undefined
        const { nodeIds, ...storageUpdates } = updates as any;

        // Sanitize updates
        const sanitizedUpdates: any = {};
        Object.entries(storageUpdates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null;
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        gunClient.getModel(modelId).get('slices').get(sliceId).put(sanitizedUpdates);
    }, [modelId]);

    const deleteSlice = useCallback((sliceId: string) => {
        if (!modelId) return;

        setSlices(prev => prev.filter(s => s.id !== sliceId)); // Optimistic update
        slicesRef.current = slicesRef.current.filter(s => s.id !== sliceId); // Immediate ref update
        tempSlicesRef.current.delete(sliceId); // Immediate DB cache update

        gunClient.getModel(modelId).get('slices').get(sliceId).put(null as any);

        // Optional: Unassign nodes from this slice?
        // For now, let's leave them orphaned or handle it in the UI
    }, [modelId]);

    // --- Definition Management ---

    const addDefinition = useCallback((def: Omit<DataDefinition, 'id'>) => {
        if (!modelId) return;
        // Use UUID for ID to allow renaming without breaking references
        const defId = uuidv4();
        const newDefData = {
            name: def.name,
            type: def.type || DefinitionType.Entity,
            description: def.description || '',
            attributes: JSON.stringify(def.attributes || [])
        };

        const newDef: DataDefinition = { id: defId, ...def };
        setDefinitions(prev => [...prev, newDef]); // Optimistic update
        definitionsRef.current = [...definitionsRef.current, newDef]; // Immediate ref update
        tempDefinitionsRef.current.set(defId, newDef); // Immediate DB cache update

        gunClient.getModel(modelId).get('definitions').get(defId).put(newDefData);
        return defId;
    }, [modelId]);

    const updateDefinition = useCallback((defId: string, updates: Partial<DataDefinition>) => {
        if (!modelId) return;
        setDefinitions(currentDefs => currentDefs.map(d => (d.id === defId ? { ...d, ...updates } : d)));

        // Update temp ref
        const existing = tempDefinitionsRef.current.get(defId);
        if (existing) {
            tempDefinitionsRef.current.set(defId, { ...existing, ...updates });
        }

        const sanitizedUpdates: any = {};
        Object.entries(updates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null;
            } else if (key === 'attributes' && Array.isArray(value)) {
                sanitizedUpdates[key] = JSON.stringify(value);
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        gunClient.getModel(modelId).get('definitions').get(defId).put(sanitizedUpdates);
    }, [modelId]);

    const deleteDefinition = useCallback((defId: string) => {
        if (!modelId) return;

        setDefinitions(prev => prev.filter(d => d.id !== defId)); // Optimistic update
        definitionsRef.current = definitionsRef.current.filter(d => d.id !== defId); // Immediate ref update
        tempDefinitionsRef.current.delete(defId); // Immediate DB cache update

        gunClient.getModel(modelId).get('definitions').get(defId).put(null as any);
    }, [modelId]);


    return {
        nodes,
        links,
        slices,
        definitions,
        isReady,
        manualPositionsRef,
        addNode,
        updateNode,
        deleteNode,
        addLink,
        updateLink,
        deleteLink,
        updateNodePosition,
        addSlice,
        updateSlice,
        deleteSlice,
        addDefinition,
        updateDefinition,
        deleteDefinition
    };
}