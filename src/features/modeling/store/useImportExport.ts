import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Node,
    Link,
    Slice,
    DataDefinition,
    ModelData,
    GunPersisted
} from '../domain/types';
import {
    exportWeavrProject,
    importWeavrProject
} from '../domain/exportUtils';
import { gunClient } from '../../collaboration';

/**
 * GunDB completely rejects any object payload containing `undefined` values.
 * This utility safely iterates through properties and specifically sets `undefined` to `null`.
 */
function sanitizeGunData<T>(obj: T): any {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeGunData);

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) {
            sanitized[key] = null;
        } else if (value && typeof value === 'object') {
            sanitized[key] = sanitizeGunData(value);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}

interface UseImportExportProps {
    modelId: string | null;
    nodes: Node[];
    links: Link[];
    slices: Slice[];
    definitions: DataDefinition[];
    edgeRoutesMap: Map<string, number[]> | undefined;
    signal: (name: string, metadata?: any) => void;
    clearSelection: () => void;
    handleClosePanel: () => void;
    manualPositionsRef: React.RefObject<Map<string, { x: number, y: number }>>;
    updateEdgeRoutes: (routes: Map<string, number[]>) => void;
    updateSliceBounds: (bounds: Map<string, { x: number, y: number, width: number, height: number }>) => void;
    onImportComplete?: () => void;
    onRequestAutoLayout?: () => void;
    sliceBoundsMap: Map<string, { x: number, y: number, width: number, height: number }>;
}

export function useImportExport({
    modelId,
    nodes,
    links,
    slices,
    definitions,
    edgeRoutesMap,
    signal,
    clearSelection,
    handleClosePanel,
    manualPositionsRef,
    updateEdgeRoutes,
    updateSliceBounds,
    onImportComplete,
    onRequestAutoLayout,
    sliceBoundsMap
}: UseImportExportProps) {

    const handleExport = useCallback(() => {
        const data = exportWeavrProject(
            nodes,
            links,
            slices,
            edgeRoutesMap || new Map(),
            sliceBoundsMap || new Map(),
            modelId || uuidv4(),
            'Untitled Project',
            'WEAVR',
            definitions
        );
        signal("Export.Started", { format: 'WEAVR', nodeCount: nodes.length.toString(), linkCount: links.length.toString() });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weavr-project-${modelId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [nodes, links, slices, edgeRoutesMap, modelId, definitions, signal]);

    const handleStandardExport = useCallback(() => {
        const data = exportWeavrProject(
            nodes,
            links,
            slices,
            edgeRoutesMap || new Map(),
            sliceBoundsMap || new Map(),
            modelId || uuidv4(),
            'Untitled Project',
            'STANDARD',
            definitions
        );
        signal("Export.Started", { format: 'STANDARD', nodeCount: nodes.length.toString(), linkCount: links.length.toString() });
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `event-model-standard-${modelId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [nodes, links, slices, edgeRoutesMap, modelId, definitions, signal]);

    const handleOpenProject = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error('File read error');
                const json = JSON.parse(result);
                const importedData = importWeavrProject(json);
                signal("Import.Started", { type: 'OPEN' });

                const data: ModelData = (importedData.nodes.length > 0) ? importedData : json;
                if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');

                // Generate NEW Model ID for "Safe Open"
                const newModelId = uuidv4();
                const model = gunClient.getModel(newModelId);

                // Prepare Data Batches
                const importedProjectName = (json.meta && json.meta.projectName) || json.projectName;

                const routeMap: Record<string, number[]> = {};
                if (importedData.edgeRoutes) {
                    Object.entries(importedData.edgeRoutes).forEach(([id, points]) => routeMap[id] = points as number[]);
                }

                const slicesBatch: Record<string, GunPersisted<Slice>> = {};
                if (data.slices) {
                    Object.values(data.slices).forEach(slice => {
                        if (!slice.id) return;
                        const { nodeIds, ...sliceData } = slice;
                        const sanitizedSlice = sanitizeGunData({ ...sliceData }) as unknown as GunPersisted<Slice>;
                        if (Array.isArray(sliceData.specifications)) sanitizedSlice.specifications = JSON.stringify(sliceData.specifications);
                        if (Array.isArray(sliceData.actors)) sanitizedSlice.actors = JSON.stringify(sliceData.actors);
                        if (Array.isArray(sliceData.aggregates)) sanitizedSlice.aggregates = JSON.stringify(sliceData.aggregates);
                        slicesBatch[slice.id] = sanitizedSlice;
                    });
                }

                const nodesBatch: Record<string, GunPersisted<Node>> = {};
                (data.nodes || []).forEach(node => {
                    const { id, ...nodeData } = node;
                    if (!id) return;
                    const sanitizedNodeData = sanitizeGunData({ ...nodeData }) as unknown as GunPersisted<Node>;
                    if (Array.isArray(nodeData.entityIds)) sanitizedNodeData.entityIds = JSON.stringify(nodeData.entityIds);
                    if (Array.isArray((nodeData as any).fields)) (sanitizedNodeData as any).fields = JSON.stringify((nodeData as any).fields);
                    nodesBatch[id] = sanitizedNodeData;
                });

                const linksBatch: Record<string, GunPersisted<Link>> = {};
                (data.links || []).forEach(link => {
                    const { id, ...linkData } = link;
                    if (!id) return;
                    linksBatch[id] = sanitizeGunData(linkData) as unknown as GunPersisted<Link>;
                });

                const defsBatch: Record<string, GunPersisted<DataDefinition>> = {};
                if (data.definitions) {
                    data.definitions.forEach(def => {
                        const { id, ...defData } = def;
                        if (!id) return;
                        const sanitizedDef = sanitizeGunData({ ...defData }) as unknown as GunPersisted<DataDefinition>;
                        if (Array.isArray(defData.attributes)) sanitizedDef.attributes = JSON.stringify(defData.attributes);
                        defsBatch[id] = sanitizedDef;
                    });
                }

                // Diagnostic Logging
                console.log(`[useImportExport] Starting import for project: ${importedProjectName}`);
                console.log(`[useImportExport] Data Summary:`, {
                    slices: Object.keys(slicesBatch).length,
                    nodes: Object.keys(nodesBatch).length,
                    links: Object.keys(linksBatch).length,
                    definitions: Object.keys(defsBatch).length
                });

                // Helper to Navigate after ALL critical writes
                const navigate = () => {
                    console.log(`[useImportExport] Navigation triggered to model: ${newModelId}`);
                    window.location.hash = newModelId;
                };

                // Track all pending writes
                let pendingWrites = 0;

                const onWriteComplete = (ack: any, id?: string) => {
                    if (ack && ack.err) {
                        console.error(`[useImportExport] Write ERROR${id ? ' for ' + id : ''}:`, ack.err);
                    } else if (id) {
                        // console.log(`[useImportExport] Write complete: ${id}`);
                    }

                    pendingWrites--;
                    if (pendingWrites <= 0) {
                        console.log(`[useImportExport] All critical writes confirmed. Navigating...`);
                        navigate();
                    }
                };

                // 1. Meta
                if (importedProjectName) {
                    pendingWrites++;
                    model.get('meta').put({ name: importedProjectName }, onWriteComplete);
                }

                // 2. Edge Routes
                if (Object.keys(routeMap).length > 0) {
                    pendingWrites++;
                    model.get('edgeRoutes').put({ routes: JSON.stringify(routeMap) }, onWriteComplete);
                }

                // 2.5 Slice Bounds (In-memory layout)
                if (importedData.sliceBounds) {
                    const boundsMap = new Map<string, { x: number, y: number, width: number, height: number }>();
                    Object.entries(importedData.sliceBounds).forEach(([id, bounds]) => boundsMap.set(id, bounds));
                    updateSliceBounds(boundsMap);
                }

                // 3. Slices (Individual writes for higher reliability)
                if (Object.keys(slicesBatch).length > 0) {
                    Object.entries(slicesBatch).forEach(([id, data]) => {
                        pendingWrites++;
                        model.get('slices').get(id).put(data as any, (ack) => onWriteComplete(ack, `slice:${id}`));
                    });
                }

                // 4. Nodes (Individual writes for higher reliability)
                if (Object.keys(nodesBatch).length > 0) {
                    Object.entries(nodesBatch).forEach(([id, data]) => {
                        pendingWrites++;
                        model.get('nodes').get(id).put(data as any, (ack) => onWriteComplete(ack, `node:${id}`));
                    });
                }

                // 5. Links
                if (Object.keys(linksBatch).length > 0) {
                    pendingWrites++;
                    model.get('links').put(linksBatch as any, (ack) => onWriteComplete(ack, 'links_batch'));
                }

                // 6. Definitions
                if (Object.keys(defsBatch).length > 0) {
                    pendingWrites++;
                    model.get('definitions').put(defsBatch as any, onWriteComplete);
                }

                // Fallback: If nothing to write (empty project?)
                if (pendingWrites === 0) {
                    navigate();
                }


                if (data.layout && Object.keys(data.layout).length > 0) {
                    // Layout exists, used above in manualPositionsRef or by nodes/edges logic
                } else {
                    // Critical: If no layout, force one
                    console.log('No layout found in project, requesting Auto Layout');
                    setTimeout(() => onRequestAutoLayout?.(), 500); // Small delay to allow nodes to sync
                }

            } catch (error) {
                alert('Failed to open project: ' + (error as Error).message);
            }
        };
        reader.readAsText(file);
    }, [signal]);

    const handleMergeImport = useCallback((file: File) => {
        if (!modelId) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error('File read error');
                const json = JSON.parse(result);
                const importedData = importWeavrProject(json);
                signal("Import.Started", { type: 'MERGE' });

                const data: ModelData = (importedData.nodes.length > 0) ? importedData : json;
                if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');

                const model = gunClient.getModel(modelId);

                // Merge Data (Additive Only)

                // Routes
                if (importedData.edgeRoutes) {
                    const routeMap = new Map<string, number[]>();
                    Object.entries(importedData.edgeRoutes).forEach(([id, points]) => routeMap.set(id, points as number[]));
                    updateEdgeRoutes(routeMap); // Direct update for feedback
                }

                if (data.slices) {
                    const slicesBatch: Record<string, GunPersisted<Slice>> = {};
                    Object.values(data.slices).forEach(slice => {
                        if (!slice.id) return;
                        const { nodeIds, ...sliceData } = slice;

                        const sanitizedSlice = sanitizeGunData({ ...sliceData }) as unknown as GunPersisted<Slice>;
                        if (Array.isArray(sliceData.specifications)) sanitizedSlice.specifications = JSON.stringify(sliceData.specifications);
                        if (Array.isArray(sliceData.actors)) sanitizedSlice.actors = JSON.stringify(sliceData.actors);
                        if (Array.isArray(sliceData.aggregates)) sanitizedSlice.aggregates = JSON.stringify(sliceData.aggregates);

                        slicesBatch[slice.id] = sanitizedSlice;
                    });
                    if (Object.keys(slicesBatch).length > 0) model.get('slices').put(slicesBatch as any);
                }

                const nodesBatch: Record<string, GunPersisted<Node>> = {};
                (data.nodes || []).forEach(node => {
                    const { id, ...nodeData } = node;
                    if (!id) return;

                    const sanitizedNodeData = sanitizeGunData({ ...nodeData }) as unknown as GunPersisted<Node>;

                    if (Array.isArray(nodeData.entityIds)) sanitizedNodeData.entityIds = JSON.stringify(nodeData.entityIds);
                    if (Array.isArray((nodeData as any).fields)) (sanitizedNodeData as any).fields = JSON.stringify((nodeData as any).fields);

                    nodesBatch[id] = sanitizedNodeData;

                    // Update manual positions locally for immediate feedback
                    if (node.fx != null && node.fy != null) manualPositionsRef.current?.set(id, { x: node.fx, y: node.fy });
                });
                if (Object.keys(nodesBatch).length > 0) model.get('nodes').put(nodesBatch as any);

                const linksBatch: Record<string, GunPersisted<Link>> = {};
                (data.links || []).forEach(link => {
                    const { id, ...linkData } = link;
                    if (!id) return;
                    linksBatch[id] = linkData as unknown as GunPersisted<Link>;
                });
                if (Object.keys(linksBatch).length > 0) model.get('links').put(linksBatch as any);

                if (data.definitions) {
                    const defsBatch: Record<string, GunPersisted<DataDefinition>> = {};
                    data.definitions.forEach(def => {
                        const { id, ...defData } = def;
                        if (!id) return;
                        const sanitizedDef = { ...defData } as unknown as GunPersisted<DataDefinition>;
                        if (Array.isArray(defData.attributes)) sanitizedDef.attributes = JSON.stringify(defData.attributes);
                        defsBatch[id] = sanitizedDef;
                    });
                    if (Object.keys(defsBatch).length > 0) model.get('definitions').put(defsBatch as any);
                }

                // NO Name Update for Merge

                clearSelection();
                handleClosePanel();

                // Notify completion
                if (onImportComplete) onImportComplete();

            } catch (error) {
                alert('Failed to import model: ' + (error as Error).message);
            }
        };
        reader.readAsText(file);
    }, [modelId, manualPositionsRef, updateEdgeRoutes, signal, clearSelection, handleClosePanel, onImportComplete]);

    return {
        handleExport,
        handleStandardExport,
        handleOpenProject,
        handleMergeImport
    };
}
