import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import gunService from '../services/gunService';
import { Node, Link, ElementType } from '../types';

export function useGunState(modelId: string | null) {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [isReady, setIsReady] = useState(false);

    // We keep manual positions in a ref to avoid re-rendering on every drag frame,
    // but we also sync them to Gun.
    const manualPositionsRef = useRef(new Map<string, { x: number, y: number }>());

    useEffect(() => {
        if (!modelId) return;

        const model = gunService.getModel(modelId);

        const tempNodes = new Map<string, Node>();
        // Subscribe to nodes
        model.get('nodes').map().on((nodeData: any, nodeId: string) => {
            if (nodeData === null) {
                tempNodes.delete(nodeId);
                manualPositionsRef.current.delete(nodeId);
            } else if (nodeData && typeof nodeData === 'object' && nodeData.type && nodeData.name) {
                const newNode: Node = {
                    id: nodeId,
                    type: nodeData.type,
                    name: nodeData.name,
                    description: nodeData.description || '',
                    x: typeof nodeData.x === 'number' ? nodeData.x : undefined,
                    y: typeof nodeData.y === 'number' ? nodeData.y : undefined,
                    fx: typeof nodeData.fx === 'number' ? nodeData.fx : null,
                    fy: typeof nodeData.fy === 'number' ? nodeData.fy : null,
                };
                if (newNode.fx != null && newNode.fy != null) {
                    manualPositionsRef.current.set(nodeId, { x: newNode.fx, y: newNode.fy });
                }
                tempNodes.set(nodeId, newNode);
            }
            setNodes(Array.from(tempNodes.values()));
        });

        const tempLinks = new Map<string, Link>();
        // Subscribe to links
        model.get('links').map().on((linkData: any, linkId: string) => {
            if (linkData === null) {
                tempLinks.delete(linkId);
            } else if (linkData && typeof linkData === 'object' && linkData.source && linkData.target) {
                const newLink: Link = {
                    id: linkId,
                    source: linkData.source,
                    target: linkData.target,
                    label: linkData.label || '',
                };
                tempLinks.set(linkId, newLink);
            }
            setLinks(Array.from(tempLinks.values()));
        });

        // Simple timeout to simulate "ready" state after initial load
        // In a real app, we might want a more robust way to know when initial data is loaded
        const timer = setTimeout(() => setIsReady(true), 500);
        return () => clearTimeout(timer);

    }, [modelId]);

    const addNode = useCallback((type: ElementType, x: number, y: number, id?: string) => {
        if (!modelId) return;
        const model = gunService.getModel(modelId);
        const nodeId = id || uuidv4();

        const formattedTypeName = type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

        const newNodeData: Omit<Node, 'id'> = {
            type,
            name: `New ${formattedTypeName}`,
            description: '',
            x: x,
            y: y,
            fx: x,
            fy: y,
        };

        model.get('nodes').get(nodeId).put(newNodeData as any);
        manualPositionsRef.current.set(nodeId, { x, y });
        return nodeId;
    }, [modelId]);

    const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
        if (!modelId) return;
        // Optimistic update
        setNodes(currentNodes => currentNodes.map(node => (node.id === nodeId ? { ...node, ...updates } : node)));
        gunService.getModel(modelId).get('nodes').get(nodeId).put(updates as any);
    }, [modelId]);

    const deleteNode = useCallback((nodeId: string) => {
        if (!modelId) return;
        const model = gunService.getModel(modelId);

        manualPositionsRef.current.delete(nodeId);
        model.get('nodes').get(nodeId).put(null as any);

        // Also delete connected links
        links.forEach(link => {
            if (link.source === nodeId || link.target === nodeId) {
                model.get('links').get(link.id).put(null as any);
            }
        });
    }, [modelId, links]);

    const addLink = useCallback((sourceId: string, targetId: string, label: string, id?: string) => {
        if (!modelId) return;
        const linkId = id || uuidv4();
        const newLinkData: Omit<Link, 'id'> = { source: sourceId, target: targetId, label };
        gunService.getModel(modelId).get('links').get(linkId).put(newLinkData as any);
        return linkId;
    }, [modelId]);

    const updateLink = useCallback((linkId: string, updates: Partial<Link>) => {
        if (!modelId) return;
        // Optimistic update
        setLinks(currentLinks => currentLinks.map(link => (link.id === linkId ? { ...link, ...updates } : link)));
        gunService.getModel(modelId).get('links').get(linkId).put(updates as any);
    }, [modelId]);

    const deleteLink = useCallback((linkId: string) => {
        if (!modelId) return;
        gunService.getModel(modelId).get('links').get(linkId).put(null as any);
    }, [modelId]);

    const updateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
        if (!modelId) return;
        manualPositionsRef.current.set(nodeId, { x, y });
        gunService.getModel(modelId).get('nodes').get(nodeId).put({ fx: x, fy: y } as any);
    }, [modelId]);

    return {
        nodes,
        links,
        isReady,
        manualPositionsRef,
        addNode,
        updateNode,
        deleteNode,
        addLink,
        updateLink,
        deleteLink,
        updateNodePosition
    };
}
