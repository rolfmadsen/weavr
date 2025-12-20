import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Group, Path, Text, Line, Arrow, Circle } from 'react-konva';
import { Portal } from 'react-konva-utils';
import Konva from 'konva';
// PERFORMANCE: Disable Perfect Draw globally for better perf
Konva.pixelRatio = 1;
import {
    Node,
    Link,
    Slice
} from '../../modeling';
import { ELEMENT_STYLE, MIN_NODE_HEIGHT, NODE_WIDTH, GRID_SIZE, FONT_FAMILY, FONT_SIZE, LINE_HEIGHT, NODE_PADDING } from '../../../shared/constants';
import Minimap from './Minimap';
import { calculateNodeHeight } from '../../modeling';
import { useSpatialIndex } from '../hooks/useSpatialIndex';

// =============================================================================
// PART 1: UTILITY FUNCTIONS
// =============================================================================

const safeNum = (val: any, def = 0): number => {
    const num = Number(val);
    return isFinite(num) ? num : def;
};

const safeStr = (val: any): string => {
    if (val === null || val === undefined) return '';
    return String(val);
};

export interface GraphCanvasKonvaRef {
    panToNode: (nodeId: string) => void;
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
    onViewChange?: (view: { x: number, y: number, scale: number }) => void;

}








// NEW: Smart Routing Calculation
function calculateSmartPoints(
    sourceNode: Node,
    targetNode: Node,
    sliceBounds: Map<string, { minX: number, maxX: number, minY: number, maxY: number }>
): number[] | null {
    const sSliceId = sourceNode.sliceId || '__default_slice__';
    const tSliceId = targetNode.sliceId || '__default_slice__';

    // Only apply smart routing for inter-slice edges
    if (sSliceId === tSliceId) return null;

    const sBounds = sliceBounds.get(sSliceId);
    const tBounds = sliceBounds.get(tSliceId);

    if (!sBounds || !tBounds) return null;



    // Calculate start and end points
    // Start: Right side of source node (Fixed at standard height center)
    const startX = safeNum(sourceNode.x) + NODE_WIDTH;
    const startY = safeNum(sourceNode.y) + MIN_NODE_HEIGHT / 2;

    // End: Left side of target node (Fixed at standard height center)
    const endX = safeNum(targetNode.x);
    const endY = safeNum(targetNode.y) + MIN_NODE_HEIGHT / 2;

    // Calculate Gap Center
    // We assume Left-to-Right layout for slices
    let gapCenter: number;

    // Check if target slice is to the right of source slice
    if (tBounds.minX > sBounds.maxX) {
        gapCenter = (sBounds.maxX + tBounds.minX) / 2;
    } else if (sBounds.minX > tBounds.maxX) {
        // Target is to the left (backward edge)
        // Route around? For now, just midpoint
        gapCenter = (tBounds.maxX + sBounds.minX) / 2;
    } else {
        // Overlap: Just use midpoint of nodes
        gapCenter = (startX + endX) / 2;
    }

    // Snap to grid
    const GRID = 20;
    const bendX = Math.round(gapCenter / GRID) * GRID;

    return [
        startX, startY,
        bendX, startY,
        bendX, endY,
        endX, endY
    ];
}

// NEW: Intra-Slice Routing (Vertical: Bottom -> Top)
function calculateIntraSlicePoints(source: Node, target: Node): number[] {
    const sH = source.computedHeight || calculateNodeHeight(source.name);

    // Start: Bottom Center of Source
    const startX = safeNum(source.x) + NODE_WIDTH / 2;
    const startY = safeNum(source.y) + sH;

    // End: Top Center of Target
    const endX = safeNum(target.x) + NODE_WIDTH / 2;
    const endY = safeNum(target.y);

    // Midpoint Y
    const midY = (startY + endY) / 2;

    return [
        startX, startY,
        startX, midY,
        endX, midY,
        endX, endY
    ];
}



// NEW: Unified Routing Resolver
function resolveLinkPoints(
    sourceNode: Node,
    targetNode: Node,
    sliceBounds: Map<string, { minX: number; maxX: number; minY: number; maxY: number }>,
    cachedRoute?: number[]
): number[] {
    // Priority 1: Custom Route from ELK (if available and not ignored)
    if (cachedRoute) return cachedRoute;

    // Priority 2: Smart Dynamic Routing
    // We REMOVED the aggressive "isVerticallyAligned" check here.
    // Instead, we trust calculateSmartPoints to return null if nodes are in the same slice.

    // Attempt Inter-Slice (Horizontal) Routing
    const smartPoints = calculateSmartPoints(sourceNode, targetNode, sliceBounds);
    if (smartPoints) return smartPoints;

    // Fallback: Intra-Slice (Vertical) Routing
    // This handles same-slice connections OR inter-slice connections that failed smart routing
    return calculateIntraSlicePoints(sourceNode, targetNode);
}

// =============================================================================
// PART 2: SUB-COMPONENTS
// =============================================================================

function getPolylineMidpoint(points: number[]): { x: number, y: number } {
    if (points.length < 4) return { x: points[0] || 0, y: points[1] || 0 };

    let totalLength = 0;
    const segments: { x1: number, y1: number, x2: number, y2: number, length: number }[] = [];

    for (let i = 0; i < points.length - 2; i += 2) {
        const x1 = points[i];
        const y1 = points[i + 1];
        const x2 = points[i + 2];
        const y2 = points[i + 3];
        const len = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        segments.push({ x1, y1, x2, y2, length: len });
        totalLength += len;
    }

    const targetDist = totalLength / 2;
    let currentDist = 0;

    for (const seg of segments) {
        if (currentDist + seg.length >= targetDist) {
            const remaining = targetDist - currentDist;
            // Handle zero-length segments to avoid NaN
            if (seg.length === 0) return { x: seg.x1, y: seg.y1 };

            const ratio = remaining / seg.length;
            return {
                x: seg.x1 + (seg.x2 - seg.x1) * ratio,
                y: seg.y1 + (seg.y2 - seg.y1) * ratio
            };
        }
        currentDist += seg.length;
    }

    // Fallback: return the middle point of the array
    const midIdx = Math.floor(points.length / 2);
    const idx = midIdx % 2 === 0 ? midIdx : midIdx - 1;
    return { x: points[idx] || 0, y: points[idx + 1] || 0 };
}

// Updated LinkGroup to accept customPoints
// Helper to compare points arrays deeply
function pointsAreEqual(p1: number[] | undefined, p2: number[] | undefined): boolean {
    if (p1 === p2) return true;
    if (!p1 || !p2) return false;
    if (p1.length !== p2.length) return false;
    for (let i = 0; i < p1.length; i++) {
        if (p1[i] !== p2[i]) return false;
    }
    return true;
}

const LinkGroup = React.memo(({ link, sourceNode: _sourceNode, targetNode: _targetNode, isSelected, isHighlighted, onLinkClick, onLinkDoubleClick, customPoints }: any) => {
    // console.log(`[LinkGroup Render] ${link.id} isSelected=${isSelected} isHighlighted=${isHighlighted}`);
    // 👇 Use customPoints (from ELK) if they exist, otherwise calculate normally
    // 👇 Use customPoints (from ELK) or assume 0,0,0,0 if missing (should not happen with resolveLinkPoints)
    const points = customPoints || [0, 0, 0, 0];

    // Calculate label position based on the true midpoint of the path
    const { x: midX, y: midY } = getPolylineMidpoint(points);

    const label = safeStr(link.label);
    const linkId = safeStr(link.id);

    const active = isSelected || isHighlighted;
    const color = active ? '#dc2626' : '#9ca3af'; // Nice red
    const width = active ? 4 : 2;

    return (
        <Group
            id={`link-group-${linkId}`}
            onClick={(e) => { e.cancelBubble = true; onLinkClick(link); }}
            onDblClick={(e) => { e.cancelBubble = true; onLinkDoubleClick(link); }}
        >
            <Line id={`link-line-${linkId}`} points={points} stroke="transparent" strokeWidth={20} hitStrokeWidth={20} listening={true} perfectDrawEnabled={false} />
            <Arrow
                id={`link-arrow-${linkId}`}
                points={points}
                stroke={color}
                strokeWidth={width}
                fill={color}
                pointerLength={6}
                pointerWidth={6}
                listening={false}
                perfectDrawEnabled={false}
            />
            {label && (
                <Group id={`link-label-group-${linkId}`} x={midX || 0} y={midY || 0}>
                    <Text
                        text={label}
                        fontSize={12}
                        fill={active ? '#dc2626' : '#4b5563'}
                        align="center"
                        offsetX={50}
                        offsetY={6}
                        width={100}
                        stroke="#f9fafb"
                        strokeWidth={3}
                        listening={false}
                    />
                    <Text
                        text={label}
                        fontSize={12}
                        fill={active ? '#dc2626' : '#4b5563'}
                        fontStyle="normal"
                        align="center"
                        offsetX={50}
                        offsetY={6}
                        width={100}
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
}, (prev, next) => {
    // Custom comparison to prevent re-renders when points array is different object but same content
    // AND all other props are equal
    return (
        prev.link === next.link &&
        prev.sourceNode === next.sourceNode &&
        prev.targetNode === next.targetNode &&
        prev.isSelected === next.isSelected &&
        prev.isHighlighted === next.isHighlighted && // Corrected property name from isHighted to isHighlighted if it was a typo in my thought, code says isHighlighted
        pointsAreEqual(prev.customPoints, next.customPoints)
    );
});

const NodeGroup = React.memo(({ node, isSelected, isValidTarget, onNodeClick, onNodeDoubleClick, onDragMove, onDragEnd, onLinkStart, stagePos, stageScale, isDraggable }: any) => {
    const defaultStyle = { color: 'gray', shape: 'rect', textColor: 'black' };
    const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE] || defaultStyle;

    const height = node.computedHeight || calculateNodeHeight(node.name);
    const width = NODE_WIDTH;
    const x = safeNum(node.x);
    const y = safeNum(node.y);

    const [showHandles, setShowHandles] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // CHANGED: Top-Left coordinate system means 0 offset
    const contentOffsetX = 0;
    const contentOffsetY = 0;

    const shadowEnabled = !isDragging;

    const shapeProps = {
        width,
        height,
        x: contentOffsetX,
        y: contentOffsetY,
        fill: style.color,
        stroke: isValidTarget ? '#22c55e' : (isSelected ? '#4f46e5' : undefined),
        strokeWidth: isValidTarget ? 4 : (isSelected ? 3 : 0),
        shadowColor: shadowEnabled ? (isValidTarget ? '#22c55e' : 'black') : undefined,
        shadowBlur: shadowEnabled ? (isValidTarget ? 15 : (isSelected ? 8 : 3)) : 0,
        shadowOpacity: shadowEnabled ? (isValidTarget ? 0.6 : 0.15) : 0,
        shadowOffset: { x: 1, y: 2 },
    };

    const renderShape = () => {
        switch (style.shape) {
            case 'circle': return <Rect {...shapeProps} cornerRadius={Math.min(height / 2, 24)} perfectDrawEnabled={false} listening={false} />;
            case 'diamond': return <Path data={`M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`} {...shapeProps} perfectDrawEnabled={false} listening={false} />;
            case 'beveled-rect':
                const c = 12;
                return <Path data={`M ${c} 0 L ${width - c} 0 L ${width} ${c} L ${width} ${height - c} L ${width - c} ${height} L ${c} ${height} L 0 ${height - c} L 0 ${c} Z`} {...shapeProps} perfectDrawEnabled={false} listening={false} />;
            default: return <Rect {...shapeProps} cornerRadius={12} perfectDrawEnabled={false} listening={false} />;
        }
    };

    // CHANGED: Handles relative to Top-Left (0,0)
    const handlePositions = [
        { x: width / 2, y: 0 },          // Top
        { x: width, y: height / 2 },     // Right
        { x: width / 2, y: height },     // Bottom
        { x: 0, y: height / 2 }          // Left
    ];

    return (
        <Portal selector=".top-layer" enabled={isDragging}>
            <Group
                id={`node-${safeStr(node.id)}`}
                x={x}
                y={y}
                draggable={isDraggable}
                onDragStart={(e) => {
                    if (!isDraggable) return;
                    setIsDragging(true);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'grabbing';
                }}
                onDragMove={(e) => {
                    onDragMove(node.id, e.target.x(), e.target.y());
                }}
                onDragEnd={(e) => {
                    setIsDragging(false);
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'grab';
                    onDragEnd(safeStr(node.id), e.target.x(), e.target.y());
                }}
                onClick={(e) => { e.cancelBubble = true; onNodeClick(node, e); }}
                onDblClick={(e) => { e.cancelBubble = true; onNodeDoubleClick(node); }}
                onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'grab';
                    setShowHandles(true);
                }}
                onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                    setShowHandles(false);
                }}
                dragBoundFunc={(pos) => {
                    // SNAP TO WORLD GRID
                    // pos is absolute (screen) position
                    const gridSize = GRID_SIZE || 20;
                    const scale = stageScale || 1;
                    const stageX = stagePos?.x || 0;
                    const stageY = stagePos?.y || 0;

                    // Convert to World
                    const worldX = (pos.x - stageX) / scale;
                    const worldY = (pos.y - stageY) / scale;

                    // Snap World
                    const snappedWorldX = Math.round(worldX / gridSize) * gridSize;
                    const snappedWorldY = Math.round(worldY / gridSize) * gridSize;

                    // Convert back to Screen
                    return {
                        x: snappedWorldX * scale + stageX,
                        y: snappedWorldY * scale + stageY
                    };
                }}
            >
                <Rect x={contentOffsetX} y={contentOffsetY} width={width} height={height} fill="transparent" listening={true} perfectDrawEnabled={false} />
                {renderShape()}
                <Text
                    x={contentOffsetX} y={contentOffsetY + 12} width={width}
                    text={`<<${safeStr(node.type).replace(/_/g, ' ')}>>`}
                    align="center" fontSize={12} opacity={0.8} fill={style.textColor}
                    listening={false}
                />
                <Text
                    x={contentOffsetX} y={contentOffsetY + 30} width={width}
                    text={safeStr(node.name)}
                    align="center"
                    fontSize={FONT_SIZE}
                    fontFamily={FONT_FAMILY}
                    lineHeight={LINE_HEIGHT}
                    fontStyle="500"
                    fill={style.textColor}
                    wrap="word"
                    padding={NODE_PADDING}
                    listening={false}
                />
                {showHandles && handlePositions.map((pos, i) => (
                    <Circle
                        key={i} x={pos.x} y={pos.y} radius={9}
                        fill="#4f46e5" stroke="white" strokeWidth={2}
                        onMouseDown={(e) => {
                            e.cancelBubble = true;
                            onLinkStart({ x: x + pos.x, y: y + pos.y });
                        }}
                        onMouseEnter={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'default';
                        }}
                    />
                ))}
            </Group>
        </Portal>
    );
});

// =============================================================================
// PART 4: SLICE RENDERING
// =============================================================================

const SliceGroup: React.FC<{ slice: Slice; nodes: Node[]; }> = React.memo(({ slice, nodes }) => {
    // 1. Calculate Bounding Box
    const bounds = useMemo(() => {
        if (nodes.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
            const x = node.x ?? 0; // Already safe
            const y = node.y ?? 0; // Already safe
            const w = NODE_WIDTH;
            const h = node.computedHeight || MIN_NODE_HEIGHT; // Already calculated

            const left = x;
            const top = y;
            const right = x + w;
            const bottom = y + h;

            if (left < minX) minX = left;
            if (top < minY) minY = top;
            if (right > maxX) maxX = right;
            if (bottom > maxY) maxY = bottom;
        });

        const padding = 20;
        return {
            x: minX - padding,
            y: minY - padding,
            width: (maxX - minX) + (padding * 2),
            height: (maxY - minY) + (padding * 2)
        };
    }, [nodes]);

    if (!bounds) return null;

    return (
        <Group>
            {/* Slice Border */}
            <Rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                // Use a darker gray for the default border if it matches the light default (#e5e7eb)
                stroke={(!slice.color || slice.color === '#e5e7eb') ? '#9ca3af' : slice.color}
                strokeWidth={2}
                dash={[10, 5]}
                cornerRadius={8}
                opacity={0.8}
                listening={false}
            />
            {/* Slice Label */}
            <Text
                x={bounds.x}
                y={bounds.y - 25} // Position above the box
                width={bounds.width}
                text={slice.title}
                fontSize={14}
                fontStyle="bold"
                fill="#374151" // Always use dark gray for text for accessibility
                align="center"
                listening={false}
            />
        </Group>
    );
});

// =============================================================================
// PART 3: MAIN COMPONENT
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
    onViewChange
}, ref) => {
    // console.log(`[GraphCanvasKonva Render] selectedIds=${selectedIds.length}`);
    const stageRef = useRef<Konva.Stage>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [tempLink, setTempLink] = useState<{ sourceId: string; startPos: { x: number; y: number }; currentPos: { x: number; y: number } } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [validTargetIds, setValidTargetIds] = useState<Set<string>>(new Set());

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

    useEffect(() => {
        if (onViewChange) {
            onViewChange({ x: stagePos.x, y: stagePos.y, scale: stageScale });
        }
    }, [stagePos, stageScale, onViewChange]);

    useImperativeHandle(ref, () => ({
        panToNode: (nodeId: string) => {
            const node = safeNodes.find(n => n.id === nodeId);
            if (node && stageRef.current) {
                const stage = stageRef.current;
                const newScale = 1;
                // CHANGED: Pan to center of node (Top-Left + Half Size)
                const newX = -((node.x ?? 0) + NODE_WIDTH / 2) * newScale + stage.width() / 2;
                const newY = -((node.y ?? 0) + (node.computedHeight || MIN_NODE_HEIGHT) / 2) * newScale + stage.height() / 2;

                stage.to({
                    x: newX,
                    y: newY,
                    scaleX: newScale,
                    scaleY: newScale,
                    duration: 0.5,
                    easing: Konva.Easings.EaseInOut,
                    onFinish: () => {
                        setStagePos({ x: newX, y: newY });
                        setStageScale(newScale);
                    }
                });
            }
        }
    }));

    const lookup = useMemo(() => {
        const nodeMap = new Map<string, Node>();
        const linksByNode = new Map<string, Link[]>();

        safeNodes.forEach(n => nodeMap.set(n.id, n));
        links.forEach(l => {
            const s = safeStr(l.source);
            const t = safeStr(l.target);
            if (!linksByNode.has(s)) linksByNode.set(s, []);
            if (!linksByNode.has(t)) linksByNode.set(t, []);
            linksByNode.get(s)?.push(l);
            linksByNode.get(t)?.push(l);
        });

        return { nodeMap, linksByNode };
    }, [safeNodes, links]);

    const handleNodeDragMove = useCallback((nodeId: string, x: number, y: number) => {
        const stage = stageRef.current;
        if (!stage) return;

        // Calculate delta for the primary dragged node
        const primaryNode = lookup.nodeMap.get(nodeId);
        const dx = primaryNode ? x - safeNum(primaryNode.x) : 0;
        const dy = primaryNode ? y - safeNum(primaryNode.y) : 0;

        // Determine which nodes to update (Multi-select support)
        const nodesToUpdate = new Set<string>();
        if (selectedIds.includes(nodeId)) {
            selectedIds.forEach(id => nodesToUpdate.add(id));
        } else {
            nodesToUpdate.add(nodeId);
        }

        // Update links for ALL moving nodes
        nodesToUpdate.forEach(movingNodeId => {
            // NEW: Manually move other selected nodes
            if (movingNodeId !== nodeId) {
                const otherNode = lookup.nodeMap.get(movingNodeId);
                if (otherNode) {
                    const newX = safeNum(otherNode.x) + dx;
                    const newY = safeNum(otherNode.y) + dy;
                    const nodeGroup = stage.findOne(`#node-${movingNodeId}`);
                    if (nodeGroup) {
                        nodeGroup.position({ x: newX, y: newY });
                    }
                }
            }

            const connectedLinks = lookup.linksByNode.get(movingNodeId) || [];

            // Batch update all connected links
            // console.log(`[Drag] Node ${movingNodeId} moving. Found ${connectedLinks.length} links.`);

            connectedLinks.forEach(link => {
                const linkId = safeStr(link.id);
                // ALWAYS update visual position during drag, ignoring cached routes
                // if (edgeRoutes && edgeRoutes.has(linkId)) return;

                const sId = safeStr(link.source);
                const tId = safeStr(link.target);

                // console.log(`[Drag] Updating Link ${linkId}`);

                // Get positions for source and target
                // If they are moving, use new pos, else use existing
                const sNodeRaw = lookup.nodeMap.get(sId);
                const tNodeRaw = lookup.nodeMap.get(tId);

                if (!sNodeRaw || !tNodeRaw) return;

                const sNode = nodesToUpdate.has(sId)
                    ? { ...sNodeRaw, x: safeNum(sNodeRaw.x) + dx, y: safeNum(sNodeRaw.y) + dy }
                    : sNodeRaw;

                const tNode = nodesToUpdate.has(tId)
                    ? { ...tNodeRaw, x: safeNum(tNodeRaw.x) + dx, y: safeNum(tNodeRaw.y) + dy }
                    : tNodeRaw;

                // Priority 2: Use the unified routing logic
                // We pass undefined for cachedRoute to force recalculation during drag
                const points = resolveLinkPoints(sNode as any, tNode as any, sliceBounds, undefined);

                const arrow = stage.findOne(`#link-arrow-${linkId}`);
                const line = stage.findOne(`#link-line-${linkId}`);
                const labelGroup = stage.findOne(`#link-label-group-${linkId}`);

                // if (!arrow) console.warn(`[Drag] Arrow not found: #link-arrow-${linkId}`);
                // if (!line) console.warn(`[Drag] Line not found: #link-line-${linkId}`);

                if (arrow instanceof Konva.Arrow) arrow.points(points);
                if (line instanceof Konva.Line) line.points(points);
                if (labelGroup instanceof Konva.Group) {
                    const mid = getPolylineMidpoint(points);
                    labelGroup.position({ x: mid.x, y: mid.y });
                }
            });
        });

        // FORCE RENDER
        stage.batchDraw();
    }, [lookup, edgeRoutes, selectedIds, sliceBounds]);

    useEffect(() => {
        if (tempLink && onValidateConnection) {
            const sourceNode = nodes.find(n => n.id === tempLink.sourceId);
            if (sourceNode) {
                const valid = new Set<string>();
                nodes.forEach(targetNode => {
                    if (targetNode.id !== sourceNode.id && onValidateConnection(sourceNode, targetNode)) {
                        valid.add(targetNode.id);
                    }
                });
                setValidTargetIds(valid);
            }
        } else {
            setValidTargetIds(new Set());
        }
    }, [tempLink, nodes, onValidateConnection]);

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



    // --- Virtualization ---
    const { search } = useSpatialIndex(nodes);
    const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(new Set());

    const updateVisibleNodes = useCallback(() => {
        if (!stageRef.current) return;

        const stage = stageRef.current;
        const scale = stage.scaleX();
        const x = -stage.x() / scale;
        const y = -stage.y() / scale;
        const width = stage.width() / scale;
        const height = stage.height() / scale;

        // Add buffer to prevent popping
        const BUFFER = 500;

        const visibleRect = {
            minX: x - BUFFER,
            minY: y - BUFFER,
            maxX: x + width + BUFFER,
            maxY: y + height + BUFFER
        };

        const results = search(visibleRect);
        const ids = new Set<string>(results.map((item: any) => item.id));
        setVisibleNodeIds(ids);
    }, [search]);

    // Update visible nodes when nodes change or layout finishes
    useEffect(() => {
        updateVisibleNodes();
    }, [nodes, updateVisibleNodes]);

    // --- Event Handlers ---

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        if (!stageRef.current) return;

        const stage = stageRef.current;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1; // Zoom Speed
        if (newScale < 0.1 || newScale > 5) return; // Keep existing scale limits

        stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };

        stage.position(newPos);

        // Update state for onViewChange and other dependencies
        setStageScale(newScale);
        setStagePos(newPos);

        // Update virtualization
        updateVisibleNodes();
    }, [updateVisibleNodes]);

    const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        // Only update if dragging the STAGE (panning)
        if (e.target === e.target.getStage()) {
            // Update state for onViewChange
            const stage = stageRef.current;
            if (stage) {
                setStagePos({ x: stage.x(), y: stage.y() });
            }
            updateVisibleNodes();
        }
    }, [updateVisibleNodes]);

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage() || e.target.name() === 'grid-background') {
            if (e.evt.shiftKey) {
                const stage = stageRef.current;
                if (stage) {
                    const pointer = stage.getRelativePointerPosition();
                    if (pointer) {
                        setMarqueeStart(pointer);
                        setMarqueeRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
                    }
                }
            } else {
                onCanvasClick(e);
            }
        }
    }, [onCanvasClick]);

    const handleMouseMove = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = stage.getRelativePointerPosition();
        if (!pointer) return;

        if (tempLink) {
            setTempLink(prev => prev ? { ...prev, currentPos: pointer } : null);
        } else if (marqueeStart) {
            setMarqueeRect({
                x: Math.min(marqueeStart.x, pointer.x),
                y: Math.min(marqueeStart.y, pointer.y),
                width: Math.abs(pointer.x - marqueeStart.x),
                height: Math.abs(pointer.y - marqueeStart.y),
            });
        }
    }, [tempLink, marqueeStart]);

    const handleMouseUp = useCallback(() => {
        if (tempLink) {
            const stage = stageRef.current;
            if (stage) {
                const pointer = stage.getPointerPosition();
                if (pointer) {
                    const shape = stage.getIntersection(pointer);
                    if (shape) {
                        let group = shape.getParent();
                        while (group && group !== stage) {
                            if (group.attrs.id && group.attrs.id.startsWith('node-')) {
                                const targetId = group.attrs.id.replace('node-', '');
                                if (targetId !== tempLink.sourceId) {
                                    onAddLink(tempLink.sourceId, targetId);
                                }
                                break;
                            }
                            group = group.getParent();
                        }
                    }
                }
            }
            setTempLink(null);
        } else if (marqueeStart && marqueeRect) {
            const selected: string[] = [];
            nodes.forEach(node => {
                if (node && typeof node === 'object') {
                    const x = safeNum(node.x);
                    const y = safeNum(node.y);
                    // Check intersection with marqueeRect (already in World Space)
                    if (x >= marqueeRect.x && x <= marqueeRect.x + marqueeRect.width && y >= marqueeRect.y && y <= marqueeRect.y + marqueeRect.height) {
                        selected.push(safeStr(node.id));
                    }
                }
            });
            onMarqueeSelect(selected);
            setMarqueeStart(null);
            setMarqueeRect(null);
        }
    }, [tempLink, marqueeStart, marqueeRect, nodes, onAddLink, onMarqueeSelect]);

    const handleNodeDragEnd = useCallback((nodeId: string, x: number, y: number) => {
        // Calculate delta
        const primaryNode = lookup.nodeMap.get(nodeId);
        const dx = primaryNode ? x - safeNum(primaryNode.x) : 0;
        const dy = primaryNode ? y - safeNum(primaryNode.y) : 0;

        const updates: { nodeId: string; pos: { x: number; y: number } }[] = [];

        if (selectedIds.includes(nodeId)) {
            selectedIds.forEach(id => {
                const node = lookup.nodeMap.get(id);
                if (node) {
                    updates.push({
                        nodeId: id,
                        pos: {
                            x: (id === nodeId ? x : safeNum(node.x) + dx),
                            y: (id === nodeId ? y : safeNum(node.y) + dy)
                        }
                    });
                }
            });
        } else {
            updates.push({ nodeId, pos: { x, y } });
        }

        onNodesDrag(updates);
    }, [onNodesDrag, selectedIds, lookup]);



    return (
        <div className="w-full h-full bg-gray-50 overflow-hidden relative" onContextMenu={(e) => e.preventDefault()}>
            <Stage
                ref={stageRef}
                width={window.innerWidth}
                height={window.innerHeight}
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
                    // Ensure stagePos is updated in real-time for minimap
                    if (e.target === e.target.getStage()) {
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                    }
                }}
                onDragEnd={(e) => {
                    if (e.target === e.target.getStage()) {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'default';
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                    }
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
            >
                <Layer>
                    {/* Infinite Grid Background */}
                    <Rect
                        x={-stagePos.x / stageScale}
                        y={-stagePos.y / stageScale}
                        width={window.innerWidth / stageScale}
                        height={window.innerHeight / stageScale}
                        fillPatternImage={gridImage || undefined}
                        fillPatternOffset={{ x: (-stagePos.x / stageScale) % (GRID_SIZE || 20), y: (-stagePos.y / stageScale) % (GRID_SIZE || 20) }}
                        name="grid-background"
                    />
                </Layer>

                {/* Slices Layer (Behind Nodes/Links) */}
                <Layer>
                    {slices.map(slice => (
                        <SliceGroup
                            key={slice.id}
                            slice={slice}
                            nodes={safeNodes.filter(n => n.sliceId === slice.id)}
                        />
                    ))}
                </Layer>

                <Layer>
                    {/* Links */}
                    {links.map((link) => {
                        const sourceNode = lookup.nodeMap.get(link.source);
                        const targetNode = lookup.nodeMap.get(link.target);
                        if (!sourceNode || !targetNode) return null;

                        // Only render if at least one node is visible (Virtualization)
                        if (!visibleNodeIds.has(sourceNode.id) && !visibleNodeIds.has(targetNode.id)) return null;

                        const isSelected = selectedIds.includes(link.id);
                        const isHighlighted = selectedIds.includes(sourceNode.id) || selectedIds.includes(targetNode.id);

                        // Unified Routing Calculation
                        const points = resolveLinkPoints(
                            sourceNode,
                            targetNode,
                            sliceBounds,
                            edgeRoutes?.get(link.id)
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

                    {/* Nodes */}
                    {safeNodes.map(node => {
                        // Virtualization Check
                        if (!visibleNodeIds.has(node.id)) return null;

                        const isSelected = selectedIds.includes(node.id);
                        const isValidTarget = validTargetIds.has(node.id);

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

            <Minimap
                nodes={safeNodes}
                stageScale={stageScale}
                stagePos={stagePos}
                viewportWidth={window.innerWidth}
                viewportHeight={window.innerHeight}
                onNavigate={(x, y) => {
                    if (stageRef.current) {
                        stageRef.current.position({ x, y });
                        setStagePos({ x, y });
                        updateVisibleNodes();
                    }
                }}
            />
        </div>
    );
});

export default GraphCanvasKonva;