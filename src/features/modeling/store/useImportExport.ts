import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Node,
    Link,
    Slice,
    DataDefinition,
    ModelData
} from '../domain/types';
import {
    exportWeavrProject,
    importWeavrProject
} from '../domain/exportUtils';
import { gunClient } from '../../collaboration';

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
    onImportComplete?: () => void;
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
    onImportComplete
}: UseImportExportProps) {

    const handleExport = useCallback(() => {
        const data = exportWeavrProject(nodes, links, slices, edgeRoutesMap || new Map(), modelId || uuidv4(), 'Untitled Project', 'WEAVR', definitions);
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
        const data = exportWeavrProject(nodes, links, slices, edgeRoutesMap || new Map(), modelId || uuidv4(), 'Untitled Project', 'STANDARD', definitions);
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

                // Write Data to New Model
                if (importedData.edgeRoutes) {
                    const routeMap: Record<string, number[]> = {};
                    Object.entries(importedData.edgeRoutes).forEach(([id, points]) => routeMap[id] = points as number[]);
                    model.get('edgeRoutes').put({ routes: JSON.stringify(routeMap) });
                }

                if (data.slices) {
                    const slicesBatch: Record<string, any> = {};
                    Object.values(data.slices).forEach(slice => {
                        if (!slice.id) return;
                        const { nodeIds, ...sliceData } = slice;
                        slicesBatch[slice.id] = sliceData;
                    });
                    if (Object.keys(slicesBatch).length > 0) model.get('slices').put(slicesBatch);
                }

                const nodesBatch: Record<string, any> = {};
                (data.nodes || []).forEach(node => {
                    const { id, ...nodeData } = node;
                    if (!id) return;

                    const sanitizedNodeData: any = {};
                    Object.entries(nodeData).forEach(([key, value]) => {
                        if (value !== undefined) {
                            if (key === 'entityIds' && Array.isArray(value)) sanitizedNodeData[key] = JSON.stringify(value);
                            else sanitizedNodeData[key] = value;
                        }
                    });
                    nodesBatch[id] = sanitizedNodeData;
                });
                if (Object.keys(nodesBatch).length > 0) model.get('nodes').put(nodesBatch);

                const linksBatch: Record<string, any> = {};
                (data.links || []).forEach(link => {
                    const { id, ...linkData } = link;
                    if (!id) return;
                    linksBatch[id] = linkData;
                });
                if (Object.keys(linksBatch).length > 0) model.get('links').put(linksBatch);

                if (data.definitions) {
                    const defsBatch: Record<string, any> = {};
                    data.definitions.forEach(def => {
                        const { id, ...defData } = def;
                        if (!id) return;
                        const sanitizedDef: any = { ...defData };
                        if (Array.isArray(sanitizedDef.attributes)) sanitizedDef.attributes = JSON.stringify(sanitizedDef.attributes);
                        defsBatch[id] = sanitizedDef;
                    });
                    if (Object.keys(defsBatch).length > 0) model.get('definitions').put(defsBatch);
                }

                // Handle Project Name for New Model
                const importedProjectName = (json.meta && json.meta.projectName) || json.projectName;

                // Helper to Navigate after critical write
                const navigate = () => {
                    window.location.hash = newModelId;
                };

                let pendingCritical = 0;

                if (importedProjectName) {
                    pendingCritical++;
                    model.get('meta').put({ name: importedProjectName }, (_) => {
                        pendingCritical--;
                        if (pendingCritical === 0) navigate();
                    });
                }

                if (Object.keys(nodesBatch).length > 0) {
                    pendingCritical++;
                    model.get('nodes').put(nodesBatch, (_) => {
                        pendingCritical--;
                        if (pendingCritical === 0) navigate();
                    });
                } else {
                    if (pendingCritical === 0) navigate();
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
                    const slicesBatch: Record<string, any> = {};
                    Object.values(data.slices).forEach(slice => {
                        if (!slice.id) return;
                        const { nodeIds, ...sliceData } = slice;
                        slicesBatch[slice.id] = sliceData;
                    });
                    if (Object.keys(slicesBatch).length > 0) model.get('slices').put(slicesBatch);
                }

                const nodesBatch: Record<string, any> = {};
                (data.nodes || []).forEach(node => {
                    const { id, ...nodeData } = node;
                    if (!id) return;

                    const sanitizedNodeData: any = {};
                    Object.entries(nodeData).forEach(([key, value]) => {
                        if (value !== undefined) {
                            if (key === 'entityIds' && Array.isArray(value)) sanitizedNodeData[key] = JSON.stringify(value);
                            else sanitizedNodeData[key] = value;
                        }
                    });
                    nodesBatch[id] = sanitizedNodeData;

                    // Update manual positions locally for immediate feedback
                    if (node.fx != null && node.fy != null) manualPositionsRef.current?.set(id, { x: node.fx, y: node.fy });
                });
                if (Object.keys(nodesBatch).length > 0) model.get('nodes').put(nodesBatch);

                const linksBatch: Record<string, any> = {};
                (data.links || []).forEach(link => {
                    const { id, ...linkData } = link;
                    if (!id) return;
                    linksBatch[id] = linkData;
                });
                if (Object.keys(linksBatch).length > 0) model.get('links').put(linksBatch);

                if (data.definitions) {
                    const defsBatch: Record<string, any> = {};
                    data.definitions.forEach(def => {
                        const { id, ...defData } = def;
                        if (!id) return;
                        const sanitizedDef: any = { ...defData };
                        if (Array.isArray(sanitizedDef.attributes)) sanitizedDef.attributes = JSON.stringify(sanitizedDef.attributes);
                        defsBatch[id] = sanitizedDef;
                    });
                    if (Object.keys(defsBatch).length > 0) model.get('definitions').put(defsBatch);
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
