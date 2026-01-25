import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import Konva from 'konva';

import { useTheme } from '../../../shared/providers/ThemeProvider';

import {
    Node,
    Link,
    Slice
} from '../../modeling';

import { MIN_NODE_HEIGHT, NODE_WIDTH, GRID_SIZE } from '../../../shared/constants';
import { calculateNodeHeight } from '../../modeling';
import { useSpatialIndex } from '../store/useSpatialIndex';
// NEW: Hooks
import { useCanvasInteractions } from '../store/useCanvasInteractions';

// NEW: Modular Components
import NodeGroup from './NodeGroup';
import LinkGroup from './LinkGroup';
import SliceGroup from './SliceGroup';
import ChapterGroup from './ChapterGroup';

// NEW: Utilities
import { safeNum, safeStr } from '../domain/canvasUtils';
import { setCanvasCursor } from '../domain/cursorUtils';

export interface GraphCanvasKonvaRef {
    panToNode: (nodeId: string) => void;
    panToSlice: (sliceId: string) => void;
    setView: (x: number, y: number, scale: number) => void;
    panToCenter: () => void;
    handleNavigate: (x: number, y: number) => void;
    getStageDataURL: (config?: any) => string | null;
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
    // onNodesDrag removed - handled internally via store
    onAddLink: (sourceId: string, targetId: string) => void;
    onCanvasClick: (event: React.MouseEvent<any> | Konva.KonvaEventObject<MouseEvent>) => void;
    onMarqueeSelect: (nodeIds: string[]) => void;
    onValidateConnection?: (source: Node, target: Node) => boolean;
    onViewChange?: (view: { x: number, y: number, scale: number, width: number, height: number }) => void;
    onSliceClick?: (slice: Slice) => void;
    initialViewState?: { x: number, y: number, scale: number, width?: number, height?: number };
    onUnpinNode?: (id: string) => void;
    onRenameChapter?: (sub: string, newName: string) => void;
}

// PERFORMANCE: Disable Perfect Draw globally for better perf
Konva.pixelRatio = 1;

// =============================================================================
// PART 1: ROUTING LOGIC (To be moved to routing.ts in Phase 2)
// =============================================================================
// NEW: Routing Utilities
import { resolveLinkPoints, getLogicalSide } from '../domain/routing';

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
    onAddLink,
    onCanvasClick,
    onMarqueeSelect,
    onValidateConnection,
    onViewChange,
    onSliceClick,
    initialViewState,
    onUnpinNode,
    onRenameChapter
}, ref) => {
    // console.log(`[GraphCanvasKonva Render] selectedIds=${selectedIds.length}`);

    const { resolvedTheme } = useTheme();
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

    // NEW: Calculate Chapter Groups for Visuals
    const chapterGroups = useMemo(() => {
        const groups = new Map<string, Slice[]>();
        slices.forEach(s => {
            const c = s.chapter || 'General';
            if (!groups.has(c)) groups.set(c, []);
            groups.get(c)!.push(s);
        });
        return Array.from(groups.entries()).map(([name, groupSlices]) => ({
            name,
            slices: groupSlices
        }));
    }, [slices]);

    // NEW: Calculate independent port sequence per node-side (True Spreading)
    const portIndexMap = useMemo(() => {
        // Map<nodeId, { N: string[], S: string[], E: string[], W: string[] }>
        const usage = new Map<string, Record<string, string[]>>();
        const processedLinks = new Set<string>();

        links.forEach(link => {
            // Deduplicate: If we have seen this link ID calculated already, skip.
            // This prevents "ghost" double-counting which shifts ports (e.g. 20px off).
            if (processedLinks.has(link.id)) return;
            processedLinks.add(link.id);

            const s = safeNodes.find(n => n.id === link.source);
            const t = safeNodes.find(n => n.id === link.target);
            if (!s || !t) return;

            let sides = getLogicalSide(s, t);

            // FORCE inter-slice links to E/W departure/arrival.
            // This ensures they always sort together on the vertical axis in the slice gap.
            if (s.sliceId !== t.sliceId) {
                const isForward = (t.x ?? 0) >= (s.x ?? 0);
                sides = { s: isForward ? 'E' : 'W', t: isForward ? 'W' : 'E' };
            }

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

            // Sort North/South ports by target X coordinate (robust logic)
            ['N', 'S'].forEach(side => {
                sides[side].sort((aId, bId) => {
                    const lA = links.find(l => l.id === aId)!;
                    const lB = links.find(l => l.id === bId)!;
                    const otherIdA = lA.source === nodeId ? lA.target : lA.source;
                    const otherIdB = lB.source === nodeId ? lB.target : lB.source;
                    const otherA = safeNodes.find(n => n.id === otherIdA);
                    const otherB = safeNodes.find(n => n.id === otherIdB);
                    const ax = (otherA?.fx ?? otherA?.x ?? 0);
                    const bx = (otherB?.fx ?? otherB?.x ?? 0);
                    return ax - bx;
                });
            });

            // Sort East/West ports by target Y coordinate (robust logic)
            ['E', 'W'].forEach(side => {
                sides[side].sort((aId, bId) => {
                    const lA = links.find(l => l.id === aId)!;
                    const lB = links.find(l => l.id === bId)!;
                    const otherIdA = lA.source === nodeId ? lA.target : lA.source;
                    const otherIdB = lB.source === nodeId ? lB.target : lB.source;
                    const otherA = safeNodes.find(n => n.id === otherIdA);
                    const otherB = safeNodes.find(n => n.id === otherIdB);
                    const ay = (otherA?.fy ?? otherA?.y ?? 0);
                    const by = (otherB?.fy ?? otherB?.y ?? 0);
                    return ay - by;
                });
            });
        });

        // Convert usage into a lookup map for each link's indices
        // Map<linkId, { sIdx: number, sTot: number, tIdx: number, tTot: number, sSide: string, tSide: string }>
        const lookupMap = new Map<string, { sIdx: number, sTot: number, tIdx: number, tTot: number, sSide: string, tSide: string }>();

        links.forEach(link => {
            const s = safeNodes.find(n => n.id === link.source);
            const t = safeNodes.find(n => n.id === link.target);
            if (!s || !t) return;

            let sides = getLogicalSide(s, t);
            if (s.sliceId !== t.sliceId) {
                const isForward = (t.x ?? 0) >= (s.x ?? 0);
                sides = { s: isForward ? 'E' : 'W', t: isForward ? 'W' : 'E' };
            }

            const sSideData = usage.get(link.source);
            const tSideData = usage.get(link.target);

            if (sSideData && tSideData) {
                const sList = sSideData[sides.s];
                const tList = tSideData[sides.t];

                lookupMap.set(link.id, {
                    sIdx: sList.indexOf(link.id),
                    sTot: sList.length,
                    tIdx: tList.indexOf(link.id),
                    tTot: tList.length,
                    sSide: sides.s,
                    tSide: sides.t
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
        nodes: safeNodes, // Corrected: Pass safeNodes to ensure computedHeight is present
        links,
        selectedIds,
        onCanvasClick,
        onMarqueeSelect,
        onViewChange,
        onAddLink,
        onValidateConnection,

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
        panToSlice: (sliceId: string) => {
            if (!stageRef.current) return;
            const stage = stageRef.current;
            const bounds = sliceBounds.get(sliceId);

            if (bounds && bounds.minX !== Infinity) {
                const padding = 20;
                const width = bounds.maxX - bounds.minX;
                const height = bounds.maxY - bounds.minY;

                const availableWidth = dimensions.width - padding * 2;
                const availableHeight = dimensions.height - padding * 2;

                const scaleX = availableWidth / width;
                const scaleY = availableHeight / height;
                const scale = Math.min(Math.min(scaleX, scaleY), 1.1); // Cap zoom at 1.1 for aesthetics

                const cx = bounds.minX + width / 2;
                const cy = bounds.minY + height / 2;

                console.log(`[panToSlice] ${sliceId}:`, {
                    bounds: { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY },
                    width, height,
                    availableWidth, availableHeight,
                    scale, scaleX, scaleY
                });

                const newX = dimensions.width / 2 - cx * scale;
                const newY = dimensions.height / 2 - cy * scale;

                stage.to({
                    x: newX,
                    y: newY,
                    scaleX: scale,
                    scaleY: scale,
                    duration: 0.5,
                    easing: Konva.Easings.EaseInOut,
                    onFinish: () => {
                        setStagePos({ x: newX, y: newY });
                        setStageScale(scale);
                        updateVisibleNodes();
                    }
                });
            }
        },
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
        panToCenter: () => {
            if (!stageRef.current || safeNodes.length === 0) return;
            const stage = stageRef.current;

            const padding = 50;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

            safeNodes.forEach(node => {
                const x = node.x ?? 0;
                const y = node.y ?? 0;
                const w = NODE_WIDTH;
                const h = node.computedHeight || MIN_NODE_HEIGHT;

                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x + w > maxX) maxX = x + w;
                if (y + h > maxY) maxY = y + h;
            });

            if (minX === Infinity) return; // Should likely be covered by length check

            const contentWidth = maxX - minX;
            const contentHeight = maxY - minY;
            const availableWidth = dimensions.width - padding * 2;
            const availableHeight = dimensions.height - padding * 2;

            const scaleX = availableWidth / contentWidth;
            const scaleY = availableHeight / contentHeight;
            // Clamp scale to reasonable limits (e.g. don't zoom in too much if few nodes)
            const scale = Math.min(Math.min(scaleX, scaleY), 1.5);

            // Center the content
            const cx = minX + contentWidth / 2;
            const cy = minY + contentHeight / 2;

            const newX = dimensions.width / 2 - cx * scale;
            const newY = dimensions.height / 2 - cy * scale;

            stage.to({
                x: newX,
                y: newY,
                scaleX: scale,
                scaleY: scale,
                duration: 0.5,
                easing: Konva.Easings.EaseInOut,
                onFinish: () => {
                    setStagePos({ x: newX, y: newY });
                    setStageScale(scale);
                    updateVisibleNodes();

                    onViewChange?.({
                        x: newX,
                        y: newY,
                        scale,
                        width: stage.width(),
                        height: stage.height()
                    });
                }
            });
        },
        handleNavigate: (x: number, y: number) => {
            if (!stageRef.current) return;
            const stage = stageRef.current;
            stage.position({ x, y });
            stage.batchDraw();
            setStagePos({ x, y });
            updateVisibleNodes();

            onViewChange?.({ x, y, scale: stage.scaleX(), width: stage.width(), height: stage.height() });
        },
        getStageDataURL: (config?: any) => {
            if (!stageRef.current) return null;
            const stage = stageRef.current;

            if (config && config.sliceId) {
                const bounds = sliceBounds.get(config.sliceId);
                // Only crop if valid bounds exist
                if (bounds && bounds.minX !== Infinity) {
                    const scale = stage.scaleX();
                    const pos = stage.position();
                    const padding = 20 * scale; // Consistent visual padding

                    // Map Model Coordinates -> Screen Coordinates
                    // ScreenX = ModelX * Scale + StageX
                    const screenX = bounds.minX * scale + pos.x;
                    const screenY = bounds.minY * scale + pos.y;
                    const screenW = (bounds.maxX - bounds.minX) * scale;
                    const screenH = (bounds.maxY - bounds.minY) * scale;

                    return stage.toDataURL({
                        ...config,
                        x: screenX - padding,
                        y: screenY - padding,
                        width: screenW + padding * 2,
                        height: screenH + padding * 2
                    });
                }
                // If bounds invalid, fall back (or handle error? Fallback safest)
                // Remove sliceId from config to avoid Konva warning if passed through?
                // Konva ignores extra keys usually.
            }

            return stage.toDataURL(config);
        }
    }));

    const [gridImage, setGridImage] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        const canvas = document.createElement('canvas');
        const size = GRID_SIZE || 20;
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = resolvedTheme === 'dark' ? '#334155' : '#d1d5db';
            ctx.beginPath();
            ctx.arc(1, 1, 1, 0, 2 * Math.PI);
            ctx.fill();
        }
        const img = new Image(); img.src = canvas.toDataURL();
        img.onload = () => setGridImage(img);
    }, [GRID_SIZE, resolvedTheme]);

    // NEW: Manual Grid Synchronization (Uncontrolled Component Pattern)
    useEffect(() => {
        if (gridRectRef.current) {
            const rect = gridRectRef.current;
            const sx = -stagePos.x / stageScale;
            const sy = -stagePos.y / stageScale;
            rect.position({ x: sx, y: sy });
            rect.width(dimensions.width / stageScale);
            rect.height(dimensions.height / stageScale);
            rect.fillPatternOffset({ x: sx % (GRID_SIZE || 20), y: sy % (GRID_SIZE || 20) });
        }
    }, [stagePos, stageScale, dimensions]); // Syncs only when idle/programmatic move

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

    // NEW: Predictable Navigation Order (Slice Order -> Vertical Y)
    const sortedNavigationNodes = useMemo(() => {
        if (!slices || slices.length === 0) {
            // Fallback: Sort all nodes by Y if no slices
            return [...safeNodes].sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
        }

        // 1. Sort Slices by Order
        const sortedSlices = [...slices].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        // 2. Build Robust Lookup Maps
        const sliceOrderMap = new Map<string, number>();
        const nodeToSliceOrderMap = new Map<string, number>();

        sortedSlices.forEach((slice, index) => {
            sliceOrderMap.set(slice.id, index);
            if (slice.nodeIds) {
                slice.nodeIds.forEach(nodeId => {
                    nodeToSliceOrderMap.set(nodeId, index);
                });
            }
        });

        // Helper: Get robust rank for a node
        const getRank = (n: Node) => {
            // Priority 1: Direct Slice ID match
            if (n.sliceId) {
                const rank = sliceOrderMap.get(n.sliceId);
                if (rank !== undefined) return rank;
            }
            // Priority 2: Reverse lookup from Slice's node list
            const reverseRank = nodeToSliceOrderMap.get(n.id);
            return reverseRank !== undefined ? reverseRank : Infinity;
        };

        // 3. Sort Nodes
        return [...safeNodes].sort((a, b) => {
            const rankA = getRank(a);
            const rankB = getRank(b);

            if (rankA !== rankB) {
                // Different Slices: Sort by Slice Order
                return rankA - rankB;
            }

            // Same Slice: Sort by Vertical Position (Y)
            return (a.y ?? 0) - (b.y ?? 0);
        });
    }, [safeNodes, slices]);

    // NEW: Global Keyboard Listener (Bypasses focus issues)
    useEffect(() => {
        const handleWindowKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }



            if (e.key === 'Tab') {
                e.preventDefault();
                e.stopPropagation();

                const direction = e.shiftKey ? -1 : 1;
                if (sortedNavigationNodes.length === 0) return;

                let nextIndex = 0;
                const currentId = selectedIds[0];
                console.log(`[Tab Debug] currentId="${currentId}", sortedNodes=${sortedNavigationNodes.length}`);

                if (currentId) {
                    const currentIndex = sortedNavigationNodes.findIndex(n => n.id === currentId);
                    console.log(`[Tab Debug] Found currentIndex=${currentIndex}`);

                    if (currentIndex !== -1) {
                        nextIndex = currentIndex + direction;
                        if (nextIndex >= sortedNavigationNodes.length) nextIndex = 0;
                        if (nextIndex < 0) nextIndex = sortedNavigationNodes.length - 1;
                    }
                }

                const nextNode = sortedNavigationNodes[nextIndex];
                if (nextNode) {
                    onNodeClick(nextNode);
                    panToNodeInternal(nextNode.id);
                }
            }
        };

        window.addEventListener('keydown', handleWindowKeyDown);
        return () => window.removeEventListener('keydown', handleWindowKeyDown);
    }, [sortedNavigationNodes, selectedIds, onNodeClick, panToNodeInternal, slices]);

    return (
        <div
            ref={containerRef}
            className="w-full flex-1 bg-gray-50 dark:bg-slate-950 overflow-hidden relative outline-none cursor-grab active:cursor-grabbing"
            tabIndex={-1} // Required to receive focus (and blur sidebar inputs)
            // onKeyDown={handleKeyDown} // Removed, using global listener
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
                        setCanvasCursor(e, 'grabbing');
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'grabbing';
                    }
                }}
                onDragMove={(e) => {
                    handleDragMove(e);
                    updateVisibleNodes(false); // Update virtualization during drag (throttled)
                }}
                onDragEnd={(e) => {
                    if (e.target === e.target.getStage()) {
                        setCanvasCursor(e, 'grab');
                        const stage = e.target.getStage();
                        if (stage) {
                            const newPos = { x: stage.x(), y: stage.y() };
                            setStagePos(newPos);
                            updateVisibleNodes(); // Update once at end
                            onViewChange?.({ ...newPos, scale: stage.scaleX(), width: stage.width(), height: stage.height() });
                        }
                    }
                }}
                onMouseDown={(e) => {
                    handleMouseDown(e);
                    // Ensure keyboard focus is on the container when clicking the canvas
                    containerRef.current?.focus();
                }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseEnter={(e) => {
                    // Ensure cursor is grab when entering the stage area
                    setCanvasCursor(e, 'grab');
                }}
            >
                <Layer>
                    {/* Infinite Grid Background */}
                    {/* Infinite Grid Background - Uncontrolled for performance */}
                    <Rect
                        ref={gridRectRef}
                        // x, y, width, height removed to prevent React overlap during drag
                        fillPatternImage={gridImage || undefined}
                        // fillPatternOffset removed
                        name="grid-background"
                        listening={true}
                    />
                </Layer>

                {/* Slices Layer (Behind Nodes/Links) */}
                <Layer>
                    {/* Chapter Visuals (Behind Slices) */}
                    {chapterGroups.map(group => (
                        <ChapterGroup
                            key={group.name}
                            chapterName={group.name}
                            slices={group.slices}
                            sliceBounds={sliceBounds}
                            onRenameChapter={onRenameChapter}
                        />
                    ))}

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