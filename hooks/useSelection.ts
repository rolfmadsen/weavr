import { useState, useCallback } from 'react';


export function useSelection() {
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

    const selectNode = useCallback((nodeId: string, multi: boolean = false) => {
        setSelectedLinkId(null);
        if (multi) {
            setSelectedNodeIds(prev => prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]);
        } else {
            setSelectedNodeIds([nodeId]);
        }
    }, []);

    const selectLink = useCallback((linkId: string) => {
        setSelectedNodeIds([]);
        setSelectedLinkId(linkId);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedNodeIds([]);
        setSelectedLinkId(null);
    }, []);

    const setSelection = useCallback((nodeIds: string[]) => {
        setSelectedNodeIds(nodeIds);
        setSelectedLinkId(null);
    }, []);

    return {
        selectedNodeIds,
        selectedLinkId,
        selectNode,
        selectLink,
        clearSelection,
        setSelection
    };
}
