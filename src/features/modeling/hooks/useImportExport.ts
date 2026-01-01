import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
    Node,
    Link,
    Slice,
    DataDefinition,
    ModelData,
    exportWeavrProject,
    importWeavrProject
} from '../index';
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
    manualPositionsRef: React.MutableRefObject<Map<string, { x: number, y: number }>>;
    updateEdgeRoutes: (routes: Map<string, number[]>) => void;
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
    updateEdgeRoutes
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

    const handleImport = useCallback((file: File) => {
        if (!modelId) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const result = e.target?.result;
                if (typeof result !== 'string') throw new Error('File read error');
                const json = JSON.parse(result);
                const importedData = importWeavrProject(json);
                signal("Import.Started");
                const data: ModelData = (importedData.nodes.length > 0) ? importedData : json;
                if (!Array.isArray(data.nodes) || !Array.isArray(data.links)) throw new Error('Invalid file format');

                const model = gunClient.getModel(modelId);
                nodes.forEach(n => model.get('nodes').get(n.id).put(null as any));
                links.forEach(l => model.get('links').get(l.id).put(null as any));
                slices.forEach(s => model.get('slices').get(s.id).put(null as any));
                definitions.forEach(d => model.get('definitions').get(d.id).put(null as any));
                manualPositionsRef.current.clear();

                if (importedData.edgeRoutes) {
                    const routeMap = new Map<string, number[]>();
                    Object.entries(importedData.edgeRoutes).forEach(([id, points]) => routeMap.set(id, points as number[]));
                    updateEdgeRoutes(routeMap);
                } else {
                    updateEdgeRoutes(new Map());
                }

                if (data.slices) {
                    Object.values(data.slices).forEach(slice => {
                        const { nodeIds, ...sliceData } = slice;
                        model.get('slices').get(slice.id).put(sliceData as any);
                    });
                }

                (data.nodes || []).forEach(node => {
                    const { id, ...nodeData } = node;
                    const sanitizedNodeData: any = {};
                    Object.entries(nodeData).forEach(([key, value]) => {
                        if (value !== undefined) {
                            if (key === 'entityIds' && Array.isArray(value)) sanitizedNodeData[key] = JSON.stringify(value);
                            else sanitizedNodeData[key] = value;
                        }
                    });
                    model.get('nodes').get(id).put(sanitizedNodeData);
                    if (node.fx != null && node.fy != null) manualPositionsRef.current.set(id, { x: node.fx, y: node.fy });
                });

                (data.links || []).forEach(link => {
                    const { id, ...linkData } = link;
                    model.get('links').get(id).put(linkData as any);
                });

                if (data.definitions) {
                    data.definitions.forEach(def => {
                        const { id, ...defData } = def;
                        const sanitizedDef: any = { ...defData };
                        if (Array.isArray(sanitizedDef.attributes)) sanitizedDef.attributes = JSON.stringify(sanitizedDef.attributes);
                        model.get('definitions').get(id).put(sanitizedDef);
                    });
                }

                clearSelection();
                handleClosePanel();
            } catch (error) {
                alert('Failed to import model: ' + (error as Error).message);
            }
        };
        reader.readAsText(file);
    }, [modelId, nodes, links, slices, definitions, manualPositionsRef, updateEdgeRoutes, signal, clearSelection, handleClosePanel]);

    return {
        handleExport,
        handleStandardExport,
        handleImport
    };
}
