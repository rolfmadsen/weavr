import { useState, useEffect, useRef, useCallback } from 'react';
import gunClient from './gunClient';
import { Node, Link, ElementType, Slice, DataDefinition, DefinitionType, SliceType, Actor } from '../../modeling';
import { useModelingData } from '../../modeling/store/modelingStore';

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
    actor?: string; // Sync Actor
    fields?: string; // Serialized Payload Schema
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
    parentId?: string;
    isRoot?: boolean;
}

interface GunActor {
    name?: string;
    description?: string;
    color?: string;
}

interface GunEdgeRoutes {
    routes?: string; // Serialized Map<string, number[]>
}

export function useGraphSync(modelId: string | null) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [slices, setSlices] = useState<Slice[]>([]);
    const [definitions, setDefinitions] = useState<DataDefinition[]>([]);
    const [actors, setActors] = useState<Actor[]>([]);
    const [edgeRoutesMap, setEdgeRoutesMap] = useState<Map<string, number[]>>(new Map());
    const [sliceBoundsMap, setSliceBoundsMap] = useState<Map<string, { x: number, y: number, width: number, height: number }>>(new Map());

    const [isReady, setIsReady] = useState(false);

    // Refs for DB state accumulation (Source of Truth for the subscription)
    const tempNodesRef = useRef(new Map<string, Node>());
    const tempLinksRef = useRef(new Map<string, Link>());
    const tempSlicesRef = useRef(new Map<string, Slice>());
    const tempDefinitionsRef = useRef(new Map<string, DataDefinition>());
    const tempActorsRef = useRef(new Map<string, Actor>());
    const tempEdgeRoutesRef = useRef(new Map<string, number[]>());
    const tempSliceBoundsRef = useRef(new Map<string, { x: number, y: number, width: number, height: number }>());

    // We keep manual positions in a ref to avoid re-rendering on every drag frame,
    // but we also sync them to Gun.
    const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());

    // Ref to track current state for merging partial updates
    const nodesRef = useRef<Node[]>([]);
    const linksRef = useRef<Link[]>([]);
    const slicesRef = useRef<Slice[]>([]);
    const definitionsRef = useRef<DataDefinition[]>([]);
    const actorsRef = useRef<Actor[]>([]);

    // Ref to track last local update time per node for Echo Cancellation
    const lastLocalUpdateRef = useRef(new Map<string, number>());

    // State for Model Metadata
    const [modelName, setModelName] = useState<string>('Untitled Model');

    // Sync refs with state
    useEffect(() => { nodesRef.current = nodes; }, [nodes]);
    useEffect(() => { linksRef.current = links; }, [links]);
    useEffect(() => { slicesRef.current = slices; }, [slices]);
    useEffect(() => { definitionsRef.current = definitions; }, [definitions]);
    useEffect(() => { actorsRef.current = actors; }, [actors]);

    useEffect(() => {
        if (!modelId) return;

        // Clear refs on new model to prevent stale data
        tempNodesRef.current.clear();
        tempLinksRef.current.clear();
        tempSlicesRef.current.clear();
        tempDefinitionsRef.current.clear();
        tempActorsRef.current.clear();
        tempEdgeRoutesRef.current.clear();
        manualPositionsRef.current.clear();

        const model = gunClient.getModel(modelId);

        // Timers for debouncing the state updates
        let nodeUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let linkUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let sliceUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let definitionUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let actorUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let edgeRoutesUpdateTimer: ReturnType<typeof setTimeout> | null = null;
        let sliceBoundsUpdateTimer: ReturnType<typeof setTimeout> | null = null;

        // Subscription: Meta (Name)
        const metaSub = model.get('meta').on((data: any) => {
            // console.log('[Sync] Meta Update Received:', data);
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
                    // Check if the data is actually different from what we have in tempNodesRef
                    // to avoid losing legitimate remote updates if we happened to touch it.
                    const existing = tempNodesRef.current.get(nodeId);
                    if (existing && nodeData && nodeData.name === existing.name && 
                        nodeData.description === existing.description &&
                        nodeData.aggregate === (existing.aggregate || null) &&
                        nodeData.service === (existing.service || null) &&
                        nodeData.sliceId === (existing.sliceId || null)) {
                        return;
                    }
                }

                if (nodeData === null) {
                    tempNodesRef.current.delete(nodeId);
                    manualPositionsRef.current.delete(nodeId);
                } else if (nodeData && typeof nodeData === 'object') {
                    const existingNode = tempNodesRef.current.get(nodeId) || nodesRef.current.find(n => n.id === nodeId);

                    if (existingNode || (nodeData.type && nodeData.name)) {
                        const newNode: Node = {
                            id: nodeId,
                            type: (nodeData.type || existingNode?.type) as ElementType,
                            name: nodeData.name || existingNode?.name || '',
                            description: nodeData.description !== undefined && nodeData.description !== null ? nodeData.description : (existingNode?.description || ''),
                            x: typeof nodeData.x === 'number' ? nodeData.x : (existingNode?.x || 0),
                            y: typeof nodeData.y === 'number' ? nodeData.y : (existingNode?.y || 0),
                            computedHeight: 40,
                            fx: typeof nodeData.fx === 'number' ? nodeData.fx : (nodeData.fx === null ? undefined : existingNode?.fx),
                            fy: typeof nodeData.fy === 'number' ? nodeData.fy : (nodeData.fy === null ? undefined : existingNode?.fy),
                            sliceId: nodeData.sliceId !== undefined && nodeData.sliceId !== null ? nodeData.sliceId : (nodeData.sliceId === null ? undefined : existingNode?.sliceId),
                            schemaBinding: nodeData.schemaBinding !== undefined && nodeData.schemaBinding !== null ? nodeData.schemaBinding : (nodeData.schemaBinding === null ? undefined : existingNode?.schemaBinding),
                            entityIds: nodeData.entityIds ? (typeof nodeData.entityIds === 'string' ? JSON.parse(nodeData.entityIds) : nodeData.entityIds) : (existingNode?.entityIds || []),
                            // Strict Mode Properties
                            service: nodeData.service !== undefined && nodeData.service !== null ? nodeData.service : (nodeData.service === null ? undefined : existingNode?.service),
                            aggregate: nodeData.aggregate !== undefined && nodeData.aggregate !== null ? nodeData.aggregate : (nodeData.aggregate === null ? undefined : existingNode?.aggregate),
                            actor: nodeData.actor !== undefined && nodeData.actor !== null ? nodeData.actor : (nodeData.actor === null ? undefined : existingNode?.actor),
                            technicalTimestamp: nodeData.technicalTimestamp !== undefined && nodeData.technicalTimestamp !== null ? nodeData.technicalTimestamp : (nodeData.technicalTimestamp === null ? undefined : existingNode?.technicalTimestamp),
                            context: nodeData.context !== undefined && nodeData.context !== null ? nodeData.context : (nodeData.context === null ? undefined : existingNode?.context),
                            pinned: nodeData.pinned !== undefined && nodeData.pinned !== null ? nodeData.pinned : (nodeData.pinned === null ? undefined : existingNode?.pinned),
                            fields: nodeData.fields ? (typeof nodeData.fields === 'string' ? JSON.parse(nodeData.fields) : nodeData.fields) : (existingNode?.fields || []),
                        };

                        if (newNode.type && newNode.name) {
                            if (newNode.fx != null && newNode.fy != null) {
                                manualPositionsRef.current.set(nodeId, { x: newNode.fx!, y: newNode.fy! });
                            }
                            tempNodesRef.current.set(nodeId, newNode);
                        }
                    }
                }

                if (nodeUpdateTimer) clearTimeout(nodeUpdateTimer);
                nodeUpdateTimer = setTimeout(() => {
                    const allNodes = Array.from(tempNodesRef.current.values());
                    setNodes(allNodes);
                    useModelingData.getState().setNodes(allNodes);
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
                    const allLinks = Array.from(tempLinksRef.current.values());
                    setLinks(allLinks);
                    useModelingData.getState().setLinks(allLinks);
                    linkUpdateTimer = null;
                }, 50);

            } catch (err) {
                console.error(`Error processing link ${linkId}:`, err);
            }
        });

        // 3. Subscribe to slices
        const slicesSub = model.get('slices').map().on((sliceData: GunSlice | null, sliceId: string) => {
            try {
                if (sliceData === null) {
                    tempSlicesRef.current.delete(sliceId);
                } else if (sliceData && typeof sliceData === 'object') {
                    const existingSlice = tempSlicesRef.current.get(sliceId) || slicesRef.current.find(s => s.id === sliceId);

                    const newSlice: Slice = {
                        id: sliceId,
                        title: sliceData.title || existingSlice?.title || 'Untitled Slice',
                        order: sliceData.order !== undefined && sliceData.order !== null ? Number(sliceData.order) : (existingSlice?.order ?? 0),
                        nodeIds: new Set(),
                        color: sliceData.color || existingSlice?.color || '#e5e7eb',
                        sliceType: sliceData.sliceType !== null ? sliceData.sliceType : (existingSlice?.sliceType || undefined),
                        context: sliceData.context !== null ? sliceData.context : (existingSlice?.context || undefined),
                        chapter: sliceData.chapter !== null ? sliceData.chapter : (existingSlice?.chapter || undefined),
                        specifications: sliceData.specifications ? (typeof sliceData.specifications === 'string' ? JSON.parse(sliceData.specifications) : sliceData.specifications) : (existingSlice?.specifications || []),
                    };
                    tempSlicesRef.current.set(sliceId, newSlice);
                }

                if (sliceUpdateTimer) clearTimeout(sliceUpdateTimer);
                sliceUpdateTimer = setTimeout(() => {
                    const sortedSlices = Array.from(tempSlicesRef.current.values()).sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
                    setSlices(sortedSlices);
                    useModelingData.getState().setSlices(sortedSlices);
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
                        parentId: defData.parentId !== undefined ? defData.parentId : existingDef?.parentId,
                        isRoot: defData.isRoot !== undefined ? !!defData.isRoot : !!existingDef?.isRoot,
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
                    const allDefs = Array.from(tempDefinitionsRef.current.values());
                    setDefinitions(allDefs);
                    useModelingData.getState().setDefinitions(allDefs);
                    definitionUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing definition ${defId}:`, err);
            }
        });

        // 5. Subscribe to Actors
        const actorsSub = model.get('actors').map().on((actorData: GunActor | null, actorId: string) => {
            try {
                if (actorData === null) {
                    tempActorsRef.current.delete(actorId);
                } else if (actorData && typeof actorData === 'object') {
                    const existingActor = tempActorsRef.current.get(actorId) || actorsRef.current.find(a => a.id === actorId);

                    const newActor: Actor = {
                        id: actorId,
                        name: actorData.name || existingActor?.name || 'Untitled Actor',
                        description: actorData.description || existingActor?.description || '',
                        color: actorData.color || existingActor?.color || '#9333ea'
                    };
                    tempActorsRef.current.set(actorId, newActor);
                }

                if (actorUpdateTimer) clearTimeout(actorUpdateTimer);
                actorUpdateTimer = setTimeout(() => {
                    const allActors = Array.from(tempActorsRef.current.values()).sort((a, b) => a.name.localeCompare(b.name));
                    setActors(allActors);
                    useModelingData.getState().setActors(allActors);
                    actorUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing actor ${actorId}:`, err);
            }
        });

        // 6. Subscribe to Edge Routes (Snapshot)
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

        // 7. Subscribe to Slice Bounds (Snapshot)
        const sliceBoundsSub = model.get('sliceBounds').on((data: any) => {
            try {
                if (data === null || !data.bounds) {
                    tempSliceBoundsRef.current.clear();
                } else {
                    const parsed = JSON.parse(data.bounds);
                    const newMap = new Map<string, { x: number, y: number, width: number, height: number }>();
                    Object.entries(parsed).forEach(([id, bounds]) => {
                        newMap.set(id, bounds as any);
                    });
                    tempSliceBoundsRef.current = newMap;
                }

                if (sliceBoundsUpdateTimer) clearTimeout(sliceBoundsUpdateTimer);
                sliceBoundsUpdateTimer = setTimeout(() => {
                    setSliceBoundsMap(new Map(tempSliceBoundsRef.current));
                    sliceBoundsUpdateTimer = null;
                }, 50);
            } catch (err) {
                console.error(`Error processing slice bounds:`, err);
            }
        });

        const readyTimer = setTimeout(() => setIsReady(true), 500);

        return () => {
            clearTimeout(readyTimer);
            if (nodeUpdateTimer) clearTimeout(nodeUpdateTimer);
            if (linkUpdateTimer) clearTimeout(linkUpdateTimer);
            if (sliceUpdateTimer) clearTimeout(sliceUpdateTimer);
            if (definitionUpdateTimer) clearTimeout(definitionUpdateTimer);
            if (actorUpdateTimer) clearTimeout(actorUpdateTimer);
            if (edgeRoutesUpdateTimer) clearTimeout(edgeRoutesUpdateTimer);
            if (sliceBoundsUpdateTimer) clearTimeout(sliceBoundsUpdateTimer);

            metaSub.off();
            nodesSub.off();
            linksSub.off();
            slicesSub.off();
            defsSub.off();
            actorsSub.off();
            routesSub.off();
            sliceBoundsSub.off();
        };

    }, [modelId]);

    return {
        nodes,
        links,
        slices,
        definitions,
        actors,
        isReady,
        manualPositionsRef,
        updateEdgeRoutes: useCallback((routes: Map<string, number[]>) => {
            if (!modelId) return;
            const obj: Record<string, number[]> = {};
            routes.forEach((points, id) => {
                obj[id] = points;
            });
            gunClient.getModel(modelId).get('edgeRoutes').put({ routes: JSON.stringify(obj) });
            // Local update for responsiveness
            setEdgeRoutesMap(new Map(routes));
            tempEdgeRoutesRef.current = new Map(routes);
        }, [modelId]),
        updateSliceBounds: useCallback((bounds: Map<string, { x: number, y: number, width: number, height: number }>) => {
            if (!modelId) return;
            const obj: Record<string, any> = {};
            bounds.forEach((b, id) => {
                obj[id] = b;
            });
            gunClient.getModel(modelId).get('sliceBounds').put({ bounds: JSON.stringify(obj) });
            // Local update
            setSliceBoundsMap(new Map(bounds));
            tempSliceBoundsRef.current = new Map(bounds);
        }, [modelId]),
        sliceBoundsMap,
        edgeRoutesMap,
        modelName,
        markLocalUpdate: useCallback((nodeId: string, changes?: Partial<Node>) => {
            lastLocalUpdateRef.current.set(nodeId, Date.now());
            if (changes) {
                const existing = tempNodesRef.current.get(nodeId) || nodesRef.current.find(n => n.id === nodeId);
                if (existing) {
                    const updated = { ...existing, ...changes };
                    tempNodesRef.current.set(nodeId, updated);
                    
                    // Trigger state update immediately for local responsiveness
                    const allNodes = Array.from(tempNodesRef.current.values());
                    setNodes(allNodes);
                    useModelingData.getState().setNodes(allNodes);
                }
            }
        }, []),
    };
}
