import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Link, Slice } from '../domain/types';
import { calculateElkLayout } from '../domain/elkLayout';

interface UseLayoutManagerProps {
    nodes: Node[];
    links: Link[];
    slicesWithNodes: Slice[];
    gunUpdateNodePosition: (id: string, x: number, y: number, pinned?: boolean) => void;
    gunUpdateNodePositionsBatch: (updates: { id: string, x: number, y: number, pinned?: boolean }[]) => void;
    updateEdgeRoutes: (routes: Map<string, number[]>) => void;
    addToHistory: (action: any) => void;
    signal: (name: string, metadata?: any) => void;
    layoutRequestId?: number;
}

export function useLayoutManager({
    nodes,
    links,
    slicesWithNodes,
    gunUpdateNodePosition,
    gunUpdateNodePositionsBatch,
    updateEdgeRoutes,
    addToHistory,
    signal,
    layoutRequestId = 0
}: UseLayoutManagerProps) {
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
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

    const handleAutoLayout = useCallback(async () => {
        const currentNodes = nodesRef.current;
        const currentLinks = linksRef.current;
        const currentSlices = slicesRef.current; // Use ref!

        if (currentNodes.length === 0) return;
        setIsLayoutLoading(true);

        try {
            // 1. Snapshot CURRENT positions
            const oldPositions = currentNodes.map(n => ({
                id: n.id,
                x: n.fx ?? n.x ?? 0,
                y: n.fy ?? n.y ?? 0
            }));

            // 2. Calculate Layout
            const { positions: newPositionsMap, edgeRoutes } = await calculateElkLayout(currentNodes, currentLinks, currentSlices);

            // 3. Update Routes
            updateEdgeRoutes(edgeRoutes);

            // 4. Update Positions in GunDB and prepare for history
            const newPositions: { id: string, x: number, y: number }[] = [];
            const batchUpdates: { id: string, x: number, y: number, pinned?: boolean }[] = [];
            let skippedPinnedCount = 0;
            let noChangeCount = 0;

            newPositionsMap.forEach((pos, nodeId) => {
                if (!nodeId) return;
                const node = currentNodes.find(n => n.id === nodeId);

                if (node) {
                    if (node.pinned) {
                        console.log("Skipping pinned node:", node.id, node.name);
                        skippedPinnedCount++;
                    } else {
                        // Check if position actually changed significantly
                        const dx = Math.abs((node.x || 0) - pos.x);
                        const dy = Math.abs((node.y || 0) - pos.y);
                        if (dx < 0.1 && dy < 0.1) {
                            // console.log(`Node ${nodeId} rejected: dx=${dx}, dy=${dy} (Current: ${node.x},${node.y} vs New: ${pos.x},${pos.y})`);
                            noChangeCount++;
                        } else {
                            console.log(`Node ${nodeId} moving: dx=${dx}, dy=${dy} (Current: ${node.x},${node.y} -> New: ${pos.x},${pos.y})`);
                            batchUpdates.push({ id: nodeId, x: pos.x, y: pos.y, pinned: node.pinned ?? false });
                            newPositions.push({ id: nodeId, x: pos.x, y: pos.y });
                        }
                    }
                }
            });

            // Execute Batch Update
            if (batchUpdates.length > 0) {
                if (gunUpdateNodePositionsBatch) {
                    gunUpdateNodePositionsBatch(batchUpdates);
                }
            }

            console.log("Layout Execution Result:", {
                totalNodes: currentNodes.length,
                updated: newPositions.length,
                skippedPinned: skippedPinnedCount,
                noChange: noChangeCount
            });

            // 5. Add to history
            addToHistory({
                type: 'BATCH_MOVE',
                payload: newPositions,
                undoPayload: oldPositions
            });

            signal("Layout.Auto", { nodeCount: currentNodes.length.toString() });

        } catch (error) {
            console.error("Auto-layout failed:", error);
        } finally {
            setIsLayoutLoading(false);
        }
    }, [gunUpdateNodePosition, updateEdgeRoutes, addToHistory, signal, gunUpdateNodePositionsBatch]); // Removed nodes, links, slices

    const lastNodeCount = useRef(nodes.length);
    const lastLinkCount = useRef(links.length);
    const lastPinnedCount = useRef(nodes.filter(n => n.pinned).length);
    const lastSlicesHash = useRef('');

    // Compute Hash for Slice Order & Chapter - Relying on Array Order (which is sorted by useGraphSync)
    const currentSlicesHash = slicesWithNodes
        .map(s => s.id)
        .join('|');

    // Debug Render
    // useEffect(() => { console.log("LayoutManager Render. RequestId:", layoutRequestId, "Hash:", currentSlicesHash); });

    // Simplified Trigger: Listens to explicit `layoutRequestId` OR significant changes
    useEffect(() => {
        const requestChanged = layoutRequestId !== lastLayoutRequestId.current;
        const nodesChanged = nodes.length !== lastNodeCount.current;
        const linksChanged = links.length !== lastLinkCount.current;
        const slicesChanged = currentSlicesHash !== lastSlicesHash.current;

        const currentPinnedCount = nodes.filter(n => n.pinned).length;
        const pinnedChanged = currentPinnedCount !== lastPinnedCount.current;

        const isFirstLoad = !hasInitialLayoutRun.current && nodes.length > 0;

        // console.log("LayoutManager Check:", { requestChanged, nodesChanged, linksChanged, slicesChanged, pinnedChanged });

        if (requestChanged || isFirstLoad || nodesChanged || linksChanged || pinnedChanged || slicesChanged) {

            lastLayoutRequestId.current = layoutRequestId;
            lastNodeCount.current = nodes.length;
            lastLinkCount.current = links.length;
            lastPinnedCount.current = currentPinnedCount;
            lastSlicesHash.current = currentSlicesHash;
            hasInitialLayoutRun.current = true; // Mark as run trigger-wise

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                handleAutoLayout();
            }, 50); // 50ms to be snappy but allow batching
        }

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [layoutRequestId, nodes.length, links.length, handleAutoLayout, currentSlicesHash]);

    return {
        isLayoutLoading,
        handleAutoLayout
    };


}