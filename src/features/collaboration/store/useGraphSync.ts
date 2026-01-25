import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import gunClient from './gunClient';
import { Node, Link, ElementType, Slice, DataDefinition, DefinitionType, SliceType } from '../../modeling';



interface GunNode {
    type?: ElementType;
    name?: string;
    description?: string;
    x?: number;
    y?: number;
    fx?: number;
    fy?: number;
    sliceId?: string;
    schemaBinding?: string;
    entityIds?: string;
    service?: string;
    aggregate?: string;
    technicalTimestamp?: boolean;
    context?: 'INTERNAL' | 'EXTERNAL';
    pinned?: boolean;
}

interface GunLink {
    source?: string;
    target?: string;
    label?: string;
    type?: string;
}

interface GunSlice {
    title?: string;
    order?: number;
    color?: string;
    sliceType?: SliceType | null;
    context?: string | null;
    specifications?: string;
    chapter?: string | null;
}

interface GunDefinition {
    name?: string;
    type?: DefinitionType;
    description?: string;
    attributes?: string;
}

interface GunEdgeRoutes {
    routes?: string; // Serialized Map<string, number[]>
}

export function useGraphSync(modelId: string | null) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [slices, setSlices] = useState<Slice[]>([]);
    const [definitions, setDefinitions] = useState<DataDefinition[]>([]);
    const [edgeRoutesMap, setEdgeRoutesMap] = useState<Map<string, number[]>>(new Map());

    const [isReady, setIsReady] = useState(false);

    // Refs for DB state accumulation (Source of Truth for the subscription)
    const tempNodesRef = useRef(new Map<string, Node>());
    const tempLinksRef = useRef(new Map<string, Link>());
    const tempSlicesRef = useRef(new Map<string, Slice>());
    const tempDefinitionsRef = useRef(new Map<string, DataDefinition>());
    const tempEdgeRoutesRef = useRef(new Map<string, number[]>());

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

    // Ref to track last local update time per node for Echo Cancellation
    const lastLocalUpdateRef = useRef(new Map<string, number>());

    // State for Model Metadata
    const [modelName, setModelName] = useState<string>('Untitled Model');

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
        tempEdgeRoutesRef.current.clear();
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
        let edgeRoutesUpdateTimer: ReturnType<typeof setTimeout> | null = null;

        // Subscription: Meta (Name)
        const metaSub = model.get('meta').on((data: any) => {
            if (data && data.name) {
                setModelName(data.name);
            }
        });

        // 1. Subscribe to nodes
        const nodesSub = model.get('nodes').map().on((nodeData: GunNode | null, nodeId: string) => {
            try {
                // Echo Cancellation: Ignore updates if we modified this node locally recently (2s)
                const lastLocal = lastLocalUpdateRef.current.get(nodeId);
                if (lastLocal && Date.now() - lastLocal < 2000) {
                    // console.log(`Ignoring echo/stale update for ${nodeId}`);
                    return;
                }

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
                            type: (nodeData.type || existingNode?.type) as ElementType,
                            name: nodeData.name || existingNode?.name || '',
                            description: nodeData.description !== undefined ? nodeData.description : (existingNode?.description || ''),
                            x: typeof nodeData.x === 'number' ? nodeData.x : (existingNode?.x || 0),
                            y: typeof nodeData.y === 'number' ? nodeData.y : (existingNode?.y || 0),
                            // width/height are computed properties not in DB usually, or handled by layout
                            computedHeight: 0, // Will be recalc-ed by UI or hook consumers
                            fx: typeof nodeData.fx === 'number' ? nodeData.fx : existingNode?.fx,
                            fy: typeof nodeData.fy === 'number' ? nodeData.fy : existingNode?.fy,
                            sliceId: nodeData.sliceId !== undefined ? nodeData.sliceId : existingNode?.sliceId,
                            schemaBinding: nodeData.schemaBinding !== undefined ? nodeData.schemaBinding : existingNode?.schemaBinding,
                            entityIds: nodeData.entityIds ? (typeof nodeData.entityIds === 'string' ? JSON.parse(nodeData.entityIds) : nodeData.entityIds) : (existingNode?.entityIds || []),
                            // Strict Mode Properties
                            service: nodeData.service !== undefined ? nodeData.service : existingNode?.service,
                            aggregate: nodeData.aggregate !== undefined ? nodeData.aggregate : existingNode?.aggregate,
                            technicalTimestamp: nodeData.technicalTimestamp !== undefined ? nodeData.technicalTimestamp : existingNode?.technicalTimestamp,
                            context: nodeData.context !== undefined ? nodeData.context : existingNode?.context,
                            pinned: nodeData.pinned !== undefined ? nodeData.pinned : existingNode?.pinned,
                        };

                        // Only set if we have the critical fields
                        if (newNode.type && newNode.name) {
                            if (newNode.fx != null && newNode.fy != null) {
                                manualPositionsRef.current.set(nodeId, { x: newNode.fx!, y: newNode.fy! });
                            }
                            // Recalculate computedHeight if possible (simple approx) or leave for UI
                            newNode.computedHeight = 40; // Default
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
        const linksSub = model.get('links').map().on((linkData: GunLink | null, linkId: string) => {
            try {
                if (linkData === null) {
                    tempLinksRef.current.delete(linkId);
                } else if (linkData && typeof linkData === 'object') {
                    const existingLink = tempLinksRef.current.get(linkId) || linksRef.current.find(l => l.id === linkId);

                    if (existingLink || (linkData.source && linkData.target)) {
                        const newLink: Link = {
                            id: linkId,
                            source: linkData.source || existingLink?.source || '',
                            target: linkData.target || existingLink?.target || '',
                            label: linkData.label !== undefined ? linkData.label : (existingLink?.label || ''),
                            type: (linkData.type || existingLink?.type) as "FLOW" | "DATA_DEPENDENCY",
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
        // console.log(`[Sync] Subscribing to slices for model ${modelId}`);
        const slicesSub = model.get('slices').map().on((sliceData: GunSlice | null, sliceId: string) => {
            // console.log(`[Sync] Received slice update:`, sliceId, sliceData);
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
                        sliceType: sliceData.sliceType || existingSlice?.sliceType,
                        context: sliceData.context || existingSlice?.context,
                        chapter: sliceData.chapter || existingSlice?.chapter, // Added
                        specifications: sliceData.specifications ? (typeof sliceData.specifications === 'string' ? JSON.parse(sliceData.specifications) : sliceData.specifications) : (existingSlice?.specifications || []),
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
        const defsSub = model.get('definitions').map().on((defData: GunDefinition | null, defId: string) => {
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
                        attributes: (() => {
                            if (!defData.attributes) return existingDef?.attributes || [];
                            if (Array.isArray(defData.attributes)) return defData.attributes;
                            if (typeof defData.attributes === 'string') {
                                try {
                                    const parsed = JSON.parse(defData.attributes);
                                    return Array.isArray(parsed) ? parsed : [];
                                } catch (e) {
                                    return existingDef?.attributes || [];
                                }
                            }
                            return existingDef?.attributes || [];
                        })(),
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

        // 5. Subscribe to Edge Routes (Snapshot)
        const routesSub = model.get('edgeRoutes').on((data: GunEdgeRoutes | null) => {
            try {
                if (data === null || !data.routes) {
                    tempEdgeRoutesRef.current.clear();
                } else {
                    const parsed = JSON.parse(data.routes);
                    const newMap = new Map<string, number[]>();
                    Object.entries(parsed).forEach(([id, points]) => {
                        newMap.set(id, points as number[]);
                    });
                    tempEdgeRoutesRef.current = newMap;
                }

                if (edgeRoutesUpdateTimer) clearTimeout(edgeRoutesUpdateTimer);
                edgeRoutesUpdateTimer = setTimeout(() => {
                    setEdgeRoutesMap(new Map(tempEdgeRoutesRef.current));
                    edgeRoutesUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing edge routes:`, err);
            }
        });

        const readyTimer = setTimeout(() => setIsReady(true), 500);

        return () => {
            clearTimeout(readyTimer);
            if (nodeUpdateTimer) clearTimeout(nodeUpdateTimer);
            if (linkUpdateTimer) clearTimeout(linkUpdateTimer);
            if (sliceUpdateTimer) clearTimeout(sliceUpdateTimer);
            if (definitionUpdateTimer) clearTimeout(definitionUpdateTimer);
            if (edgeRoutesUpdateTimer) clearTimeout(edgeRoutesUpdateTimer);

            metaSub.off();
            nodesSub.off();
            linksSub.off();
            slicesSub.off();
            defsSub.off();
            routesSub.off();
        };

    }, [modelId]);

    const updateModelName = useCallback((name: string) => {
        if (!modelId) return;
        gunClient.getModel(modelId).get('meta').put({ name });
    }, [modelId]);

    const addNode = useCallback((type: ElementType, x: number, y: number, id?: string, sliceId?: string) => {
        if (!modelId) return;
        const model = gunClient.getModel(modelId);
        const nodeId = id || uuidv4();
        if (!nodeId) return nodeId;

        const formattedTypeName = type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

        const newNodeData = {
            type,
            name: `New ${formattedTypeName}`,
            description: '',
            x: x,
            y: y,
            fx: x,
            fy: y,
            pinned: true,
            entityIds: JSON.stringify([]), // Initialize as array for local state
        };

        if (sliceId) {
            (newNodeData as any).sliceId = sliceId;
        }

        const newNode: Node = { id: nodeId, ...newNodeData, entityIds: [] };
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
        if (!modelId || !nodeId) return;

        // Special handling for pinning: if unpinning, clear fixed coordinates
        const enhancedUpdates = { ...updates };
        if (updates.pinned === false) {
            enhancedUpdates.fx = undefined;
            enhancedUpdates.fy = undefined;
        }

        setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, ...enhancedUpdates } : node)));

        // Update temp ref
        const existing = tempNodesRef.current.get(nodeId);
        if (existing) {
            tempNodesRef.current.set(nodeId, { ...existing, ...enhancedUpdates });
        }

        // Sanitize updates for Gun: undefined -> null (to delete), keep others
        const sanitizedUpdates: Record<string, any> = {};
        Object.entries(enhancedUpdates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null; // Gun uses null to delete/unset
            } else if (key === 'entityIds' && Array.isArray(value)) {
                sanitizedUpdates[key] = JSON.stringify(value);
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        // Ensure if we are unpinning, we also tell Gun to clear fx/fy
        if (updates.pinned === false) {
            sanitizedUpdates.fx = null;
            sanitizedUpdates.fy = null;
            // Also clear manual override ref
            manualPositionsRef.current.delete(nodeId);
        }

        gunClient.getModel(modelId).get('nodes').get(nodeId).put(sanitizedUpdates);

        // Echo Cancellation
        lastLocalUpdateRef.current.set(nodeId, Date.now());
    }, [modelId]);

    const deleteNode = useCallback((nodeId: string) => {
        if (!modelId || !nodeId) return;
        const model = gunClient.getModel(modelId);

        setNodes(prev => prev.filter(n => n.id !== nodeId)); // Optimistic update
        nodesRef.current = nodesRef.current.filter(n => n.id !== nodeId); // Immediate ref update
        tempNodesRef.current.delete(nodeId); // Immediate DB cache update
        manualPositionsRef.current.delete(nodeId);

        model.get('nodes').get(nodeId).put(null);
        links.forEach(link => {
            if (link.source === nodeId || link.target === nodeId) {
                model.get('links').get(link.id).put(null);
            }
        });
    }, [modelId, links]);

    const addLink = useCallback((sourceId: string, targetId: string, label: string, id?: string) => {
        if (!modelId) return;

        // Auto-slice association
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        if (sourceNode && targetNode) {
            if (sourceNode.sliceId && !targetNode.sliceId) {
                updateNode(targetId, { sliceId: sourceNode.sliceId });
            } else if (!sourceNode.sliceId && targetNode.sliceId) {
                updateNode(sourceId, { sliceId: targetNode.sliceId });
            }
        }

        const linkId = id || uuidv4();
        if (!linkId) return linkId;
        const newLinkData = { source: sourceId, target: targetId, label: label || '' };

        const newLink: Link = { id: linkId, ...newLinkData };
        setLinks(prev => [...prev, newLink]); // Optimistic update
        linksRef.current = [...linksRef.current, newLink]; // Immediate ref update
        tempLinksRef.current.set(linkId, newLink); // Immediate DB cache update

        gunClient.getModel(modelId).get('links').get(linkId).put(newLinkData);
        return linkId;
    }, [modelId, nodes, updateNode]);


    const updateLink = useCallback((linkId: string, updates: Partial<Link>) => {
        if (!modelId || !linkId) return;
        setLinks(currentLinks => currentLinks.map(link => (link.id === linkId ? { ...link, ...updates } : link)));

        // Update temp ref
        const existing = tempLinksRef.current.get(linkId);
        if (existing) {
            tempLinksRef.current.set(linkId, { ...existing, ...updates });
        }

        // Sanitize updates
        const sanitizedUpdates: Record<string, any> = {};
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
        if (!modelId || !linkId) return;

        setLinks(prev => prev.filter(l => l.id !== linkId)); // Optimistic update
        linksRef.current = linksRef.current.filter(l => l.id !== linkId); // Immediate ref update
        tempLinksRef.current.delete(linkId); // Immediate DB cache update

        gunClient.getModel(modelId).get('links').get(linkId).put(null);
    }, [modelId]);


    const updateNodePosition = useCallback((nodeId: string, x: number, y: number, pinned?: boolean) => {
        if (!modelId || !nodeId) return;

        // If pinned is not provided, we assume it's a user action (default to true)
        const finalPinned = pinned !== undefined ? pinned : true;

        // Ensure numbers are valid
        const safeX = isNaN(x) ? 0 : x;
        const safeY = isNaN(y) ? 0 : y;

        setNodes(currentNodes => currentNodes.map(node => (
            node.id === nodeId
                ? {
                    ...node,
                    x: safeX,
                    y: safeY,
                    fx: finalPinned ? safeX : undefined,
                    fy: finalPinned ? safeY : undefined,
                    pinned: finalPinned
                }
                : node
        )));

        // Update temp ref
        const existing = tempNodesRef.current.get(nodeId);
        if (existing) {
            tempNodesRef.current.set(nodeId, {
                ...existing,
                x: safeX,
                y: safeY,
                fx: finalPinned ? safeX : undefined,
                fy: finalPinned ? safeY : undefined,
                pinned: finalPinned
            });
        }

        manualPositionsRef.current.set(nodeId, { x: safeX, y: safeY });

        gunClient.getModel(modelId).get('nodes').get(nodeId).put({
            x: safeX,
            y: safeY,
            fx: finalPinned ? safeX : null,
            fy: finalPinned ? safeY : null,
            pinned: finalPinned
        });

        // Echo Cancellation
        lastLocalUpdateRef.current.set(nodeId, Date.now());
    }, [modelId]);

    const updateNodePositionsBatch = useCallback((updates: { id: string, x: number, y: number, pinned?: boolean }[]) => {
        if (!modelId || updates.length === 0) return;

        const batch: Record<string, any> = {};

        updates.forEach(({ id, x, y, pinned }) => {
            if (!id) return;
            // Echo Cancellation
            lastLocalUpdateRef.current.set(id, Date.now());

            const safeX = isNaN(x) ? 0 : x;
            const safeY = isNaN(y) ? 0 : y;
            const finalPinned = pinned !== undefined ? pinned : true;

            // Prepare GunDB batch payload
            batch[id] = {
                x: safeX,
                y: safeY,
                fx: finalPinned ? safeX : null,
                fy: finalPinned ? safeY : null,
                pinned: finalPinned
            };

            // Update local refs
            const existing = tempNodesRef.current.get(id);
            if (existing) {
                tempNodesRef.current.set(id, {
                    ...existing,
                    x: safeX,
                    y: safeY,
                    fx: finalPinned ? safeX : undefined,
                    fy: finalPinned ? safeY : undefined,
                    pinned: finalPinned
                });
            }
            manualPositionsRef.current.set(id, { x: safeX, y: safeY });
        });

        // Optimistic State Update
        setNodes(currentNodes => {
            const updateMap = new Map(updates.map(u => [u.id, u]));
            return currentNodes.map(node => {
                const update = updateMap.get(node.id);
                if (update) {
                    const finalPinned = update.pinned !== undefined ? update.pinned : true;
                    return {
                        ...node,
                        x: update.x,
                        y: update.y,
                        fx: finalPinned ? update.x : undefined,
                        fy: finalPinned ? update.y : undefined,
                        pinned: finalPinned
                    };
                }
                return node;
            });
        });

        // Execute Batch Update
        gunClient.getModel(modelId).get('nodes').put(batch);

    }, [modelId]);

    const unpinNode = useCallback((nodeId: string) => {
        if (!modelId || !nodeId) return;

        // Set echo cancellation lock
        lastLocalUpdateRef.current.set(nodeId, Date.now());

        // Optimistic State Update
        setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, pinned: false, fx: undefined, fy: undefined } : node)));

        // Immediate Ref Update (Race Condition Protection)
        const updatedNode = nodesRef.current.find(n => n.id === nodeId);
        if (updatedNode) {
            const newNodeState = { ...updatedNode, pinned: false, fx: undefined, fy: undefined };
            nodesRef.current = nodesRef.current.map(n => n.id === nodeId ? newNodeState : n); // Update array in place/ref
            tempNodesRef.current.set(nodeId, newNodeState as Node); // Force update temp ref
        }

        manualPositionsRef.current.delete(nodeId);
        gunClient.getModel(modelId).get('nodes').get(nodeId).put({ pinned: false, fx: null, fy: null });
    }, [modelId]);

    const unpinAllNodes = useCallback(() => {
        if (!modelId) return;

        // Immediate Ref Update & Temp Ref Update
        const newNodes = nodesRef.current.map(node => {
            if (node.pinned) {
                lastLocalUpdateRef.current.set(node.id, Date.now()); // Lock each node in Echo Cancellation
                manualPositionsRef.current.delete(node.id);
                gunClient.getModel(modelId).get('nodes').get(node.id).put({ pinned: false, fx: null, fy: null });
                const newNodeState = { ...node, pinned: false, fx: undefined, fy: undefined };
                tempNodesRef.current.set(node.id, newNodeState as Node);
                return newNodeState;
            }
            return node;
        });

        nodesRef.current = newNodes;
        setNodes(newNodes);
    }, [modelId]);
    // --- Slice Management ---

    const addSlice = useCallback((title: string, order: number, type?: SliceType, context?: string) => {
        if (!modelId) return;
        const sliceId = uuidv4();
        if (!sliceId) return;
        const gunPayload = {
            title: title || 'Untitled',
            order: order || 0,
            color: '#e5e7eb',
            sliceType: type || null,
            context: context || null
        };

        const newSlice: Slice = {
            id: sliceId,
            title: title || 'Untitled',
            order: order || 0,
            color: '#e5e7eb',
            sliceType: type,
            context: context,
            nodeIds: new Set()
        };

        setSlices(prev => [...prev, newSlice].sort((a, b) => (a.order || 0) - (b.order || 0))); // Optimistic update
        slicesRef.current = [...slicesRef.current, newSlice].sort((a, b) => (a.order || 0) - (b.order || 0)); // Immediate ref update
        tempSlicesRef.current.set(sliceId, newSlice); // Immediate DB cache update

        gunClient.getModel(modelId).get('slices').get(sliceId).put(gunPayload);
        return sliceId;
    }, [modelId]);

    const updateSlice = useCallback((sliceId: string, updates: Partial<Slice>) => {
        if (!modelId || !sliceId) return;
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
        const sanitizedUpdates: Record<string, any> = {};
        Object.entries(storageUpdates).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedUpdates[key] = null;
            } else if (key === 'specifications' && Array.isArray(value)) {
                sanitizedUpdates[key] = JSON.stringify(value);
            } else {
                sanitizedUpdates[key] = value;
            }
        });

        gunClient.getModel(modelId).get('slices').get(sliceId).put(sanitizedUpdates);
    }, [modelId]);

    const deleteSlice = useCallback((sliceId: string) => {
        if (!modelId || !sliceId) return;

        setSlices(prev => prev.filter(s => s.id !== sliceId)); // Optimistic update
        slicesRef.current = slicesRef.current.filter(s => s.id !== sliceId); // Immediate ref update
        tempSlicesRef.current.delete(sliceId); // Immediate DB cache update

        gunClient.getModel(modelId).get('slices').get(sliceId).put(null);

        // Optional: Unassign nodes from this slice?
        // For now, let's leave them orphaned or handle it in the UI
    }, [modelId]);

    // --- Definition Management ---

    const addDefinition = useCallback((def: Omit<DataDefinition, 'id'>) => {
        if (!modelId) return;
        // Use UUID for ID to allow renaming without breaking references
        const defId = uuidv4();
        if (!defId) return;
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
        if (!modelId || !defId) return;
        setDefinitions(currentDefs => currentDefs.map(d => (d.id === defId ? { ...d, ...updates } : d)));

        // Update temp ref
        const existing = tempDefinitionsRef.current.get(defId);
        if (existing) {
            tempDefinitionsRef.current.set(defId, { ...existing, ...updates });
        }

        const sanitizedUpdates: Record<string, any> = {};
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
        if (!modelId || !defId) return;

        setDefinitions(prev => prev.filter(d => d.id !== defId)); // Optimistic update
        definitionsRef.current = definitionsRef.current.filter(d => d.id !== defId); // Immediate ref update
        tempDefinitionsRef.current.delete(defId); // Immediate DB cache update

        gunClient.getModel(modelId).get('definitions').get(defId).put(null);
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
        updateNodePositionsBatch,
        addSlice,
        updateSlice,
        deleteSlice,
        unpinNode,
        unpinAllNodes,
        addDefinition,
        updateDefinition,
        deleteDefinition,
        updateEdgeRoutes: (routes: Map<string, number[]>) => {
            if (!modelId) return;
            const obj: Record<string, number[]> = {};
            routes.forEach((points, id) => {
                obj[id] = points;
            });
            gunClient.getModel(modelId).get('edgeRoutes').put({ routes: JSON.stringify(obj) });
            // Local update for responsiveness
            setEdgeRoutesMap(new Map(routes));
            tempEdgeRoutesRef.current = new Map(routes);
        },
        edgeRoutesMap,
        modelName,
        updateModelName
    };
}