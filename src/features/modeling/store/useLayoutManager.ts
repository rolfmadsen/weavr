import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Link, Slice } from '../domain/types';
import { calculateElkLayout } from '../domain/elkLayout';
import { bus } from '../../../shared/events/eventBus';

interface UseLayoutManagerProps {
    nodes: Node[];
    links: Link[];
    slicesWithNodes: Slice[];
    updateEdgeRoutes: (routes: Map<string, number[]>) => void;
    updateSliceBounds: (bounds: Map<string, { x: number, y: number, width: number, height: number }>) => void;
    signal: (name: string, metadata?: any) => void;
    layoutRequestId?: number;
}

export function useLayoutManager({
    nodes,
    links,
    slicesWithNodes,
    updateEdgeRoutes,
    updateSliceBounds,
    signal,
    layoutRequestId = 0
}: UseLayoutManagerProps) {
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
    const loadingRef = useRef(false);
    const lastLayoutRequestId = useRef(layoutRequestId);
    const hasInitialLayoutRun = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Refs to access latest state inside stable callback
    const nodesRef = useRef(nodes);
    const linksRef = useRef(links);
    const slicesRef = useRef(slicesWithNodes);

    useEffect(() => {
        nodesRef.current = nodes;
        linksRef.current = links;
        slicesRef.current = slicesWithNodes;
    }, [nodes, links, slicesWithNodes]);

    const handleAutoLayout = useCallback(async (reason: string = 'manual') => {
        const currentNodes = nodesRef.current;
        const currentLinks = linksRef.current;
        const currentSlices = slicesRef.current;

        if (currentNodes.length === 0) return;

        if (loadingRef.current) {
            console.warn(`[LayoutManager] Layout already in progress (requested by: ${reason}), skipping.`);
            return;
        }

        console.log(`[LayoutManager] Starting layout. Reason: ${reason}, Nodes: ${currentNodes.length}`);
        setIsLayoutLoading(true);
        loadingRef.current = true;

        try {
            // 1. Calculate Layout
            const { positions: newPositionsMap, edgeRoutes, containerBounds } = await calculateElkLayout(currentNodes, currentLinks, currentSlices);

            // 2. Update Metadata (visual only)
            updateEdgeRoutes(edgeRoutes);
            if (containerBounds) {
                updateSliceBounds(containerBounds);
            }

            // 3. Determine necessary position updates
            const batchUpdates: { id: string, x: number, y: number }[] = [];
            let skippedPinnedCount = 0;
            let noChangeCount = 0;

            newPositionsMap.forEach((pos, nodeId) => {
                const node = currentNodes.find(n => n.id === nodeId);
                if (node) {
                    if (node.pinned) {
                        skippedPinnedCount++;
                    } else {
                        // Check if position actually changed significantly
                        const dx = Math.abs((node.x || 0) - pos.x);
                        const dy = Math.abs((node.y || 0) - pos.y);
                        if (dx < 0.1 && dy < 0.1) {
                            noChangeCount++;
                        } else {
                            batchUpdates.push({ id: nodeId, x: pos.x, y: pos.y });
                        }
                    }
                }
            });

            // 4. Dispatch movements via Event Bus
            if (batchUpdates.length > 0) {
                console.log(`[LayoutManager] Dispatching moveNodes for ${batchUpdates.length} nodes (Updated from ELK).`);
                bus.emit('command:moveNodes', {
                    updates: batchUpdates
                });
            }

            console.log(`[LayoutManager] Layout Success Summary:`, {
                reason,
                totalNodes: currentNodes.length,
                updated: batchUpdates.length,
                skippedPinned: skippedPinnedCount,
                noChange: noChangeCount
            });

            signal("Layout.Auto", { nodeCount: currentNodes.length.toString(), reason });

        } catch (error) {
            console.error(`[LayoutManager] Layout Failed. Reason: ${reason}`, error);
        } finally {
            setIsLayoutLoading(false);
            loadingRef.current = false;
        }
    }, [updateEdgeRoutes, signal]);

    const triggerLayout = useCallback((reason: string, delay = 800) => {
        console.log(`[LayoutManager] Debounce triggered for: ${reason} (delay: ${delay}ms)`);
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            console.log(`[LayoutManager] Executing debounced layout for: ${reason}`);
            handleAutoLayout(reason);
        }, delay);
    }, [handleAutoLayout]);

    const lastNodeCount = useRef(nodes.length);
    const lastLinkCount = useRef(links.length);

    // Reactive Triggers: Based on prop changes (Count changes or explicit Request Signal)
    useEffect(() => {
        const requestChanged = layoutRequestId !== lastLayoutRequestId.current;
        const nodesChanged = nodes.length !== lastNodeCount.current;
        const linksChanged = links.length !== lastLinkCount.current;
        const isFirstLoad = !hasInitialLayoutRun.current && nodes.length > 0;

        if (requestChanged || isFirstLoad || nodesChanged || linksChanged) {
            const reason = requestChanged ? "Request Signal" :
                isFirstLoad ? "Initial Load" :
                    nodesChanged ? "Node Count Change" : "Link Count Change";

            lastLayoutRequestId.current = layoutRequestId;
            lastNodeCount.current = nodes.length;
            lastLinkCount.current = links.length;
            hasInitialLayoutRun.current = true;

            triggerLayout(reason, 500);
        }
    }, [layoutRequestId, nodes.length, links.length, triggerLayout]);

    // Unified cleanup for unmount only
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                console.log("[LayoutManager] Clearing debounce timer on unmount");
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    // Event Triggers: Based on modeling facts (Slice changes, Pinned status changes)
    useEffect(() => {
        const onNodeUpdated = ({ changes }: { changes: Partial<Node> }) => {
            if ('sliceId' in changes || 'name' in changes || 'actor' in changes || changes.pinned === false) {
                triggerLayout(`node:updated(${Object.keys(changes).join(',')})`, 300);
            }
        };

        const onNodePinned = ({ pinned }: { pinned: boolean }) => {
            if (!pinned) triggerLayout('node:unpinned', 300);
        };

        const onNodesPinned = ({ pinned }: { pinned: boolean }) => {
            if (!pinned) triggerLayout('nodes:unpinned', 300);
        };

        const hCreateNode = () => triggerLayout('node:created', 300);
        const hDeleteNode = () => triggerLayout('node:deleted', 300);
        const hCreateLink = () => triggerLayout('link:created', 300);
        const hDeleteLink = () => triggerLayout('link:deleted', 300);

        bus.on('node:created', hCreateNode);
        bus.on('node:deleted', hDeleteNode);
        bus.on('node:updated', onNodeUpdated);
        bus.on('node:pinned', onNodePinned);
        bus.on('nodes:pinned', onNodesPinned);
        bus.on('link:created', hCreateLink);
        bus.on('link:deleted', hDeleteLink);

        return () => {
            bus.off('node:created', hCreateNode);
            bus.off('node:deleted', hDeleteNode);
            bus.off('node:updated', onNodeUpdated);
            bus.off('node:pinned', onNodePinned);
            bus.off('nodes:pinned', onNodesPinned);
            bus.off('link:created', hCreateLink);
            bus.off('link:deleted', hDeleteLink);
        };
    }, [triggerLayout]);

    return {
        isLayoutLoading,
        handleAutoLayout
    };
}