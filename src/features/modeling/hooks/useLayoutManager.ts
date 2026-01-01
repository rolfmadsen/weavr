import { useState, useCallback, useEffect, useRef } from 'react';
import { Node, Link, Slice, calculateElkLayout } from '../index';

interface UseLayoutManagerProps {
    nodes: Node[];
    links: Link[];
    slicesWithNodes: Slice[];
    gunUpdateNodePosition: (id: string, x: number, y: number, pinned?: boolean) => void;
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
    updateEdgeRoutes,
    addToHistory,
    signal,
    layoutRequestId = 0
}: UseLayoutManagerProps) {
    const [isLayoutLoading, setIsLayoutLoading] = useState(false);
    const lastLayoutRequestId = useRef(layoutRequestId);
    const hasInitialLayoutRun = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleAutoLayout = useCallback(async () => {
        if (nodes.length === 0) return;
        setIsLayoutLoading(true);

        try {
            // 1. Snapshot CURRENT positions
            const oldPositions = nodes.map(n => ({
                id: n.id,
                x: n.fx ?? n.x ?? 0,
                y: n.fy ?? n.y ?? 0
            }));

            // 2. Calculate Layout
            const { positions: newPositionsMap, edgeRoutes } = await calculateElkLayout(nodes, links, slicesWithNodes);

            // 3. Update Routes
            updateEdgeRoutes(edgeRoutes);

            // 4. Update Positions in GunDB and prepare for history
            const newPositions: { id: string, x: number, y: number }[] = [];
            let skippedPinnedCount = 0;
            let noChangeCount = 0;

            newPositionsMap.forEach((pos, nodeId) => {
                if (!nodeId) return;
                const node = nodes.find(n => n.id === nodeId);

                if (node) {
                    if (node.pinned) {
                        skippedPinnedCount++;
                        // console.log(`Skipping pinned node: ${node.name} (${node.id})`);
                    } else {
                        // Check if position actually changed significantly
                        const dx = Math.abs((node.x || 0) - pos.x);
                        const dy = Math.abs((node.y || 0) - pos.y);
                        if (dx < 0.1 && dy < 0.1) {
                            noChangeCount++;
                        } else {
                            gunUpdateNodePosition(nodeId, pos.x, pos.y, node.pinned ?? false);
                            newPositions.push({ id: nodeId, x: pos.x, y: pos.y });
                        }
                    }
                }
            });

            console.log("Layout Execution Result:", {
                totalNodes: nodes.length,
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

            signal("Layout.Auto", { nodeCount: nodes.length.toString() });

        } catch (error) {
            console.error("Auto-layout failed:", error);
        } finally {
            setIsLayoutLoading(false);
        }
    }, [nodes, links, slicesWithNodes, gunUpdateNodePosition, updateEdgeRoutes, addToHistory, signal]);

    // Simplified Trigger: Listens to explicit `layoutRequestId` OR significant count changes (init/add/delete)
    useEffect(() => {
        const requestChanged = layoutRequestId !== lastLayoutRequestId.current;
        const isFirstLoad = !hasInitialLayoutRun.current && nodes.length > 0;

        if (requestChanged || isFirstLoad) {
            console.log("LayoutManager: Triggered by", requestChanged ? "Request Signal" : "Initial Load");
            lastLayoutRequestId.current = layoutRequestId;
            hasInitialLayoutRun.current = true; // Mark as run trigger-wise

            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                handleAutoLayout();
            }, 50);
        }

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [layoutRequestId, nodes.length, links.length, handleAutoLayout]);

    return {
        isLayoutLoading,
        handleAutoLayout
    };
}
