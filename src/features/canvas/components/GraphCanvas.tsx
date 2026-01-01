import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';

import {
    Node,
    Link,
    Slice
} from '../../modeling';
import { MIN_NODE_HEIGHT, NODE_WIDTH, GRID_SIZE } from '../../../shared/constants';
import { calculateNodeHeight } from '../../modeling';
import { useSpatialIndex } from '../hooks/useSpatialIndex';
// NEW: Hooks
import { useCanvasInteractions } from '../hooks/useCanvasInteractions';

// NEW: Modular Components
import NodeGroup from './NodeGroup';
import LinkGroup from './LinkGroup';
import SliceGroup from './SliceGroup';

// NEW: Utilities
import { safeNum, safeStr } from '../utils/canvasUtils';

export interface GraphCanvasKonvaRef {
    panToNode: (nodeId: string) => void;
    setView: (x: number, y: number, scale: number) => void;
    panToCenter: () => void;
    handleNavigate: (x: number, y: number) => void;
}

interface GraphCanvasKonvaProps {
    nodes: Node[];
    links: Link[];
    slices?: Slice[];
    selectedIds: string[];
    edgeRoutes?: Map<string, number[]>;
    onNodeClick: (node: Node, event?: any) => void;
    onLinkClick: (link: Link) => void;
    onNodeDoubleClick: (node: Node) => void;
    onLinkDoubleClick: (link: Link) => void;
    onNodesDrag: (updates: { nodeId: string; pos: { x: number; y: number } }[]) => void;
    onAddLink: (sourceId: string, targetId: string) => void;
    onCanvasClick: (event: React.MouseEvent<any> | Konva.KonvaEventObject<MouseEvent>) => void;
    onMarqueeSelect: (nodeIds: string[]) => void;
    onValidateConnection?: (source: Node, target: Node) => boolean;
    onViewChange?: (view: { x: number, y: number, scale: number, width: number, height: number }) => void;
    onSliceClick?: (slice: Slice) => void;
    initialViewState?: { x: number, y: number, scale: number, width?: number, height?: number };
    onUnpinNode?: (id: string) => void;
}

// PERFORMANCE: Disable Perfect Draw globally for better perf
Konva.pixelRatio = 1;

// =============================================================================
// PART 1: ROUTING LOGIC (To be moved to routing.ts in Phase 2)
// =============================================================================
// NEW: Routing Utilities
import { resolveLinkPoints, getLogicalSide } from '../utils/routing';

// =============================================================================
// PART 2: MAIN COMPONENT
// =============================================================================

const GraphCanvasKonva = forwardRef<GraphCanvasKonvaRef, GraphCanvasKonvaProps>(({
    nodes,
    links,
    slices = [], // Default to empty array
    selectedIds,
    edgeRoutes,
    onNodeClick,
    onLinkClick,
    onNodeDoubleClick,
    onLinkDoubleClick,
    onNodesDrag,
    onAddLink,
    onCanvasClick,
    onMarqueeSelect,
    onValidateConnection,
    onViewChange,
    onSliceClick,
    initialViewState,
    onUnpinNode
}, ref) => {
    // console.log(`[GraphCanvasKonva Render] selectedIds=${selectedIds.length}`);
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

    // 1. Gather Nodes & Basic Safety (Consolidated)
    // We do this ONCE at the top so everyone else uses clean data
    const safeNodes = useMemo(() => {
        const result: Node[] = [];
        const seenIds = new Set<string>();

        if (Array.isArray(nodes)) {
            nodes.forEach(n => {
                if (n && typeof n === 'object' && !Array.isArray(n)) {
                    const id = safeStr(n.id);
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);

                        let x = safeNum(n.x);
                        let y = safeNum(n.y);

                        // Calculate height once
                        const computedHeight = calculateNodeHeight(safeStr(n.name));
                        result.push({ ...n, id, x, y, computedHeight });
                    }
                }
            });
        }
        return result;
    }, [nodes]);

    // NEW: Calculate Slice Bounds for Smart Routing
    const sliceBounds = useMemo(() => {
        const bounds = new Map<string, { minX: number, maxX: number, minY: number, maxY: number }>();
        const DEFAULT_SLICE_ID = '__default_slice__';

        safeNodes.forEach(node => {
            const sliceId = node.sliceId || DEFAULT_SLICE_ID;
            const current = bounds.get(sliceId) || {
                minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity
            };

            const x = node.x ?? 0; // Already safe
            const y = node.y ?? 0; // Already safe
            const w = NODE_WIDTH;
            const h = node.computedHeight || MIN_NODE_HEIGHT; // Already calculated

            bounds.set(sliceId, {
                minX: Math.min(current.minX, x),
                maxX: Math.max(current.maxX, x + w),
                minY: Math.min(current.minY, y),
                maxY: Math.max(current.maxY, y + h)
            });
        });
        return bounds;
    }, [safeNodes]);

    // NEW: Calculate independent port sequence per node-side (True Spreading)
    const portIndexMap = useMemo(() => {
        // Map<nodeId, { N: string[], S: string[], E: string[], W: string[] }>
        const usage = new Map<string, Record<string, string[]>>();

        links.forEach(link => {
            const s = safeNodes.find(n => n.id === link.source);
            const t = safeNodes.find(n => n.id === link.target);
            if (!s || !t) return;

            const sides = getLogicalSide(s, t);

            // Initialize collections for source and target nodes
            if (!usage.has(s.id)) usage.set(s.id, { N: [], S: [], E: [], W: [] });
            if (!usage.has(t.id)) usage.set(t.id, { N: [], S: [], E: [], W: [] });

            usage.get(s.id)![sides.s].push(link.id);
            usage.get(t.id)![sides.t].push(link.id);
        });

        // NEW: Sort each side's links spatially to prevent crossings
        usage.forEach((sides, nodeId) => {
            const node = safeNodes.find(n => n.id === nodeId);
            if (!node) return;

            // Sort North/South ports by target X coordinate
            ['N', 'S'].forEach(side => {
                sides[side].sort((aId, bId) => {
                    const lA = links.find(l => l.id === aId)!;
                    const lB = links.find(l => l.id === bId)!;
                    const otherIdA = lA.source === nodeId ? lA.target : lA.source;
                    const otherIdB = lB.source === nodeId ? lB.target : lB.source;
                    const otherA = safeNodes.find(n => n.id === otherIdA);
                    const otherB = safeNodes.find(n => n.id === otherIdB);
                    return (otherA?.x || 0) - (otherB?.x || 0);
                });
            });

            // Sort East/West ports by target Y coordinate
            ['E', 'W'].forEach(side => {
                sides[side].sort((aId, bId) => {
                    const lA = links.find(l => l.id === aId)!;
                    const lB = links.find(l => l.id === bId)!;
                    const otherIdA = lA.source === nodeId ? lA.target : lA.source;
                    const otherIdB = lB.source === nodeId ? lB.target : lB.source;
                    const otherA = safeNodes.find(n => n.id === otherIdA);
                    const otherB = safeNodes.find(n => n.id === otherIdB);
                    return (otherA?.y || 0) - (otherB?.y || 0);
                });
            });
        });

        // Convert usage into a lookup map for each link's indices
        // Map<linkId, { sIdx, sTot, tIdx, tTot }>
        const lookupMap = new Map<string, { sIdx: number, sTot: number, tIdx: number, tTot: number }>();

        links.forEach(link => {
            const sSideData = usage.get(link.source);
            const tSideData = usage.get(link.target);

            if (sSideData && tSideData) {
                const s = safeNodes.find(n => n.id === link.source)!;
                const t = safeNodes.find(n => n.id === link.target)!;
                const sides = getLogicalSide(s, t);

                const sList = sSideData[sides.s];
                const tList = tSideData[sides.t];

                lookupMap.set(link.id, {
                    sIdx: sList.indexOf(link.id),
                    sTot: sList.length,
                    tIdx: tList.indexOf(link.id),
                    tTot: tList.length
                });
            }
        });

        return lookupMap;
    }, [links, safeNodes]);


    // --- Virtualization ---
    const { search } = useSpatialIndex(nodes);
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());
    const virtualizationTimerRef = useRef<NodeJS.Timeout | null>(null);

    const updateVisibleNodes = useCallback((immediate = false) => {
        if (!stageRef.current) return;

        const performUpdate = () => {
            const stage = stageRef.current;
            if (!stage) return;
            const scale = stage.scaleX();
            const x = -stage.x() / scale;
            const y = -stage.y() / scale;
            const width = stage.width() / scale;
            const height = stage.height() / scale;

            // Add buffer to prevent popping
            const BUFFER = 800; // Increased buffer slightly for smoother fast-scrolling

            const visibleRect = {
                minX: x - BUFFER,
                minY: y - BUFFER,
                maxX: x + width + BUFFER,
                maxY: y + height + BUFFER
            };

            const results = search(visibleRect);
            const ids = new Set<string>(results.map((item: any) => item.id));
            setVisibleNodeIds(ids);
            virtualizationTimerRef.current = null;
        };

        if (immediate) {
            if (virtualizationTimerRef.current) clearTimeout(virtualizationTimerRef.current);
            performUpdate();
        } else if (!virtualizationTimerRef.current) {
            virtualizationTimerRef.current = setTimeout(performUpdate, 60); // 60fps-ish delay
        }
    }, [search]);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                setDimensions({
                    width: entry.contentRect.width,
                    height: entry.contentRect.height
                });
                updateVisibleNodes(true);
            }
        });

        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [updateVisibleNodes]);

    const gridRectRef = useRef<Konva.Rect>(null);

    const {
        stageScale, setStageScale,
        stagePos, setStagePos,
        tempLink, setTempLink,
        marqueeRect,
        validTargetIds,
        handleWheel,
        handleDragMove,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleNodeDragMove,
        handleNodeDragEnd,
        lookup
    } = useCanvasInteractions({
        stageRef: stageRef as React.RefObject<Konva.Stage>,
        gridRectRef: gridRectRef as React.RefObject<Konva.Rect>,
        nodes,
        links,
        selectedIds,
        onCanvasClick,
        onMarqueeSelect,
        onViewChange,
        onAddLink,
        onValidateConnection,
        onNodesDrag,
        updateVisibleNodes,
        sliceBounds
    });

    // Internal Pan Logic for ref use
    const panToNodeInternal = useCallback((nodeId: string) => {
        if (!stageRef.current) return;
        const stage = stageRef.current;
        const nodeGroup = stage.findOne('#node-' + nodeId);

        if (nodeGroup) {
            const box = nodeGroup.getClientRect({ skipTransform: false });
            const absCenter = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            const screenCenter = { x: stage.width() / 2, y: stage.height() / 2 };
            const dx = screenCenter.x - absCenter.x;
            const dy = screenCenter.y - absCenter.y;

            const newX = stage.x() + dx;
            const newY = stage.y() + dy;
            const currentScale = stage.scaleX();

            stage.to({
                x: newX, y: newY, scaleX: currentScale, scaleY: currentScale,
                duration: 0.4, easing: Konva.Easings.EaseInOut,
                onFinish: () => {
                    setStagePos({ x: newX, y: newY });
                    setStageScale(currentScale);
                    updateVisibleNodes();
                    if (gridRectRef.current) {
                        const sx = -newX / currentScale;
                        const sy = -newY / currentScale;
                        gridRectRef.current.position({ x: sx, y: sy });
                        gridRectRef.current.fillPatternOffset({ x: sx % (GRID_SIZE || 20), y: sy % (GRID_SIZE || 20) });
                    }
                }
            });
            return;
        }

        const node = safeNodes.find(n => n.id === nodeId);
        if (!node) return;

        const newScale = 1;
        const newX = -((node.x ?? 0) + NODE_WIDTH / 2) * newScale + stage.width() / 2;
        const newY = -((node.y ?? 0) + (node.computedHeight || MIN_NODE_HEIGHT) / 2) * newScale + stage.height() / 2;

        stage.to({
            x: newX, y: newY, scaleX: newScale, scaleY: newScale,
            duration: 0.4,
            onFinish: () => {
                setStagePos({ x: newX, y: newY });
                setStageScale(newScale);
                updateVisibleNodes();
            }
        });
    }, [safeNodes, updateVisibleNodes, setStagePos, setStageScale]);

    useImperativeHandle(ref, () => ({
        panToNode: (nodeId: string) => panToNodeInternal(nodeId),
        setView: (x: number, y: number, scale: number) => {
            if (stageRef.current) {
                const stage = stageRef.current;
                stage.position({ x, y });
                stage.scale({ x: scale, y: scale });
                stage.batchDraw();
                setStagePos({ x, y });
                setStageScale(scale);
            }
        },
        panToCenter: () => { },
        handleNavigate: (x: number, y: number) => {
            if (!stageRef.current) return;
            const stage = stageRef.current;
            stage.position({ x, y });
            stage.batchDraw();
            setStagePos({ x, y });
            updateVisibleNodes();

            onViewChange?.({ x, y, scale: stage.scaleX(), width: stage.width(), height: stage.height() });
        }
    }));

    const [gridImage, setGridImage] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        const canvas = document.createElement('canvas');
        const size = GRID_SIZE || 20;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#d1d5db'; ctx.beginPath(); ctx.arc(1, 1, 1, 0, 2 * Math.PI); ctx.fill();
        }
        const img = new Image(); img.src = canvas.toDataURL();
        img.onload = () => setGridImage(img);
    }, [GRID_SIZE]);

    // NEW: Sync initial view state and trigger first virtualization pass
    useEffect(() => {
        if (initialViewState) {
            setStageScale(initialViewState.scale);
            setStagePos({ x: initialViewState.x, y: initialViewState.y });

            if (stageRef.current) {
                stageRef.current.scale({ x: initialViewState.scale, y: initialViewState.scale });
                stageRef.current.position({ x: initialViewState.x, y: initialViewState.y });
                stageRef.current.batchDraw();
            }
        }
        // Force an immediate virtualization update on mount
        updateVisibleNodes(true);
    }, []); // Only on mount

    // NEW: Trigger virtualization update whenever nodes change (e.g. arrive from GunDB)
    useEffect(() => {
        updateVisibleNodes(true);
    }, [nodes.length, updateVisibleNodes]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            const direction = e.shiftKey ? -1 : 1;
            if (safeNodes.length === 0) return;

            let nextIndex = 0;
            const currentId = selectedIds[0];
            if (currentId) {
                const currentIndex = safeNodes.findIndex(n => n.id === currentId);
                if (currentIndex !== -1) {
                    nextIndex = currentIndex + direction;
                    if (nextIndex >= safeNodes.length) nextIndex = 0;
                    if (nextIndex < 0) nextIndex = safeNodes.length - 1;
                }
            }

            const nextNode = safeNodes[nextIndex];
            if (nextNode) {
                onNodeClick(nextNode);
                panToNodeInternal(nextNode.id);
            }
        }
    }, [safeNodes, selectedIds, onNodeClick, panToNodeInternal]);

    return (
        <div
            ref={containerRef}
            className="w-full flex-1 bg-gray-50 overflow-hidden relative outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onContextMenu={(e) => e.preventDefault()}
        >
            <Stage
                ref={stageRef}
                width={dimensions.width}
                height={dimensions.height}
                draggable
                onWheel={handleWheel}
                onDragStart={(e) => {
                    // Prevent Stage dragging if Shift is pressed (Marquee Select)
                    if (e.target === e.target.getStage() && e.evt.shiftKey) {
                        e.target.stopDrag();
                        return;
                    }
                    if (e.target === e.target.getStage()) {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'grabbing';
                    }
                }}
                onDragMove={(e) => {
                    handleDragMove(e);
                    // REMOVED setStagePos to prevents rerenders
                }}
                onDragEnd={(e) => {
                    if (e.target === e.target.getStage()) {
                        const stage = e.target.getStage();
                        if (stage) {
                            stage.container().style.cursor = 'default';
                            const newPos = { x: stage.x(), y: stage.y() };
                            setStagePos(newPos);
                            updateVisibleNodes(); // Update once at end
                            onViewChange?.({ ...newPos, scale: stage.scaleX(), width: stage.width(), height: stage.height() });
                        }
                    }
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    {/* Infinite Grid Background */}
                    <Rect
                        ref={gridRectRef}
                        x={-stagePos.x / stageScale}
                        y={-stagePos.y / stageScale}
                        width={dimensions.width / stageScale}
                        height={dimensions.height / stageScale}
                        fillPatternImage={gridImage || undefined}
                        fillPatternOffset={{ x: (-stagePos.x / stageScale) % (GRID_SIZE || 20), y: (-stagePos.y / stageScale) % (GRID_SIZE || 20) }}
                        name="grid-background"
                        listening={true} // Ensure it catches clicks if needed
                    />
                </Layer>

                {/* Slices Layer (Behind Nodes/Links) */}
                <Layer>
                    {slices.map(slice => (
                        <SliceGroup
                            key={slice.id}
                            slice={slice}
                            nodes={safeNodes.filter(n => n.sliceId === slice.id)}
                            onSliceClick={onSliceClick}
                        />
                    ))}
                </Layer>

                {/* Links Layer */}
                <Layer name="links-layer">
                    {links.map((link) => {
                        const sourceNode = lookup.nodeMap.get(link.source);
                        const targetNode = lookup.nodeMap.get(link.target);
                        if (!sourceNode || !targetNode) return null;

                        const isSelected = selectedIds.includes(link.id);
                        const isHighlighted = selectedIds.includes(sourceNode.id) || selectedIds.includes(targetNode.id);

                        // Only render if at least one node is visible (Virtualization)
                        // EXCEPTION: Always render if the link or its endpoints are selected
                        if (!visibleNodeIds.has(sourceNode.id) && !visibleNodeIds.has(targetNode.id) && !isSelected && !isHighlighted) return null;

                        // Unified Routing Calculation
                        const portData = portIndexMap.get(link.id);
                        const points = resolveLinkPoints(
                            sourceNode,
                            targetNode,
                            sliceBounds,
                            edgeRoutes?.get(link.id),
                            portData?.sIdx,
                            portData?.sTot,
                            portData?.tIdx,
                            portData?.tTot
                        );

                        return (
                            <LinkGroup
                                key={link.id}
                                link={link}
                                sourceNode={sourceNode}
                                targetNode={targetNode}
                                isSelected={isSelected}
                                isHighlighted={isHighlighted}
                                onLinkClick={onLinkClick}
                                onLinkDoubleClick={onLinkDoubleClick}
                                customPoints={points} // Pass calculated points
                            />
                        );
                    })}
                    {tempLink && (
                        <Line
                            points={[tempLink.startPos.x, tempLink.startPos.y, tempLink.currentPos.x, tempLink.currentPos.y]}
                            stroke="#4f46e5"
                            strokeWidth={2}
                        />
                    )}
                </Layer>

                {/* Nodes Layer */}
                <Layer name="nodes-layer">
                    {safeNodes.map(node => {
                        const isSelected = selectedIds.includes(node.id);
                        const isValidTarget = validTargetIds.has(node.id);

                        // Virtualization Check
                        // EXCEPTION: Always render if selected
                        if (!visibleNodeIds.has(node.id) && !isSelected) return null;

                        return (
                            <NodeGroup
                                key={node.id}
                                node={node}
                                isSelected={isSelected}
                                isValidTarget={isValidTarget}
                                onNodeClick={onNodeClick}
                                onNodeDoubleClick={onNodeDoubleClick}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onLinkStart={(pos: { x: number; y: number }) => setTempLink({ sourceId: node.id, startPos: pos, currentPos: pos })}
                                onUnpin={(id) => onUnpinNode?.(id)}
                                stagePos={stagePos}
                                stageScale={stageScale}
                                isDraggable={true}
                            />
                        );
                    })}

                    {/* Marquee Selection Rect */}
                    {marqueeRect && (
                        <Rect
                            x={marqueeRect.x}
                            y={marqueeRect.y}
                            width={marqueeRect.width}
                            height={marqueeRect.height}
                            fill="rgba(79, 70, 229, 0.1)"
                            stroke="#4f46e5"
                            strokeWidth={1}
                        />
                    )}
                </Layer>
                {/* Portal Layer for dragging nodes on top */}
                <Layer name="top-layer" className="top-layer" />
            </Stage>

        </div >
    );
});

export default GraphCanvasKonva;