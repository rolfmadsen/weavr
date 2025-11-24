import React, { useRef, useState, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Stage, Layer, Rect, Group, Path, Text, Line, Arrow, Circle } from 'react-konva';
import { Portal } from 'react-konva-utils';
import Konva from 'konva';
import { Node, Link, Slice } from '../types';
import { ELEMENT_STYLE, MIN_NODE_HEIGHT, NODE_WIDTH, GRID_SIZE } from '../constants';
import Minimap from './Minimap';
import { calculateNodeHeight } from '../utils/textUtils';

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
    selectedIds: string[];
    slices: Slice[];
    swimlanePositions: Map<string, { x: number; y: number }>;
    showSlices: boolean;
    // 👇 ADDED THIS PROP
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
    experimentalLayoutEnabled?: boolean;
}

function calculatePoints(sNode: { x: number, y: number, h?: number }, tNode: { x: number, y: number, h?: number }): number[] {
    const sx = sNode.x;
    const sy = sNode.y;
    const tx = tNode.x;
    const ty = tNode.y;

    const w2 = NODE_WIDTH / 2;
    const sourceH2 = (sNode.h || MIN_NODE_HEIGHT) / 2;
    const targetH2 = (tNode.h || MIN_NODE_HEIGHT) / 2;

    const dx = tx - sx;
    const dy = ty - sy;
    let p1, p2, p3, p4;

    if (Math.abs(dx) > Math.abs(dy)) {
        p1 = { x: sx + Math.sign(dx) * w2, y: sy };
        p4 = { x: tx - Math.sign(dx) * w2, y: ty };
        const midX = sx + dx / 2;
        p2 = { x: midX, y: p1.y };
        p3 = { x: midX, y: p4.y };
    } else {
        p1 = { x: sx, y: sy + Math.sign(dy) * sourceH2 };
        p4 = { x: tx, y: ty - Math.sign(dy) * targetH2 };
        const midY = sy + dy / 2;
        p2 = { x: p1.x, y: midY };
        p3 = { x: p4.x, y: midY };
    }

    return [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y, p4.x, p4.y];
}

function calculateOrthogonalPathPoints(source: Node, target: Node): number[] {
    const sH = safeNum(source.computedHeight, MIN_NODE_HEIGHT);
    const tH = safeNum(target.computedHeight, MIN_NODE_HEIGHT);
    return calculatePoints(
        { x: safeNum(source.x) + NODE_WIDTH / 2, y: safeNum(source.y) + sH / 2, h: sH },
        { x: safeNum(target.x) + NODE_WIDTH / 2, y: safeNum(target.y) + tH / 2, h: tH }
    );
}

// =============================================================================
// PART 2: SUB-COMPONENTS
// =============================================================================

// Updated LinkGroup to accept customPoints
const LinkGroup = React.memo(({ link, sourceNode, targetNode, isSelected, onLinkClick, onLinkDoubleClick, customPoints }: any) => {
    // 👇 Use customPoints (from ELK) if they exist, otherwise calculate normally
    const points = customPoints || calculateOrthogonalPathPoints(sourceNode, targetNode);

    // Calculate label position based on the middle segment of the path
    const midIdx = Math.floor(points.length / 2) - (Math.floor(points.length / 2) % 2);
    // Ensure we don't go out of bounds
    const idx = Math.max(0, Math.min(midIdx, points.length - 2));

    const midX = (points[idx] + points[idx + 2] || points[idx]) / 2; // Fallback logic
    const midY = (points[idx + 1] + points[idx + 3] || points[idx + 1]) / 2;

    const label = safeStr(link.label);
    const linkId = safeStr(link.id);

    return (
        <Group
            id={`link-group-${linkId}`}
            onClick={(e) => { e.cancelBubble = true; onLinkClick(link); }}
            onDblClick={(e) => { e.cancelBubble = true; onLinkDoubleClick(link); }}
        >
            <Line id={`link-line-${linkId}`} points={points} stroke="transparent" strokeWidth={20} />
            <Arrow
                id={`link-arrow-${linkId}`}
                points={points}
                stroke={isSelected ? '#4f46e5' : '#9ca3af'}
                strokeWidth={2}
                fill={isSelected ? '#4f46e5' : '#9ca3af'}
                pointerLength={6}
                pointerWidth={6}
                listening={false}
            />
            {label && (
                <Group id={`link-label-group-${linkId}`} x={midX || 0} y={midY || 0}>
                    <Text
                        text={label}
                        fontSize={12}
                        fill={isSelected ? '#4f46e5' : '#4b5563'}
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
                        fill={isSelected ? '#4f46e5' : '#4b5563'}
                        fontStyle={isSelected ? '500' : 'normal'}
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
});

const NodeGroup = React.memo(({ node, isSelected, isValidTarget, onNodeClick, onNodeDoubleClick, onDragMove, onDragEnd, onLinkStart, onHoverChange, stagePos, stageScale, isDraggable }: any) => {
    const defaultStyle = { color: 'gray', shape: 'rect', textColor: 'black' };
    const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE] || defaultStyle;

    const height = safeNum(node.computedHeight, MIN_NODE_HEIGHT);
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
            case 'circle': return <Rect {...shapeProps} cornerRadius={height / 2} />;
            case 'diamond': return <Path data={`M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`} {...shapeProps} />;
            case 'beveled-rect':
                const c = 12;
                return <Path data={`M ${c} 0 L ${width - c} 0 L ${width} ${c} L ${width} ${height - c} L ${width - c} ${height} L ${c} ${height} L 0 ${height - c} L 0 ${c} Z`} {...shapeProps} />;
            default: return <Rect {...shapeProps} cornerRadius={12} />;
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
                    onHoverChange(true);
                }}
                onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                    setShowHandles(false);
                    onHoverChange(false);
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
                <Rect x={contentOffsetX} y={contentOffsetY} width={width} height={height} fill="transparent" />
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
                    align="center" fontSize={14} fontStyle="500" fill={style.textColor} wrap="word"
                    listening={false}
                />
                {showHandles && handlePositions.map((pos, i) => (
                    <Circle
                        key={i} x={pos.x} y={pos.y} radius={9}
                        fill="#4f46e5" stroke="white" strokeWidth={2}
                        onMouseEnter={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'crosshair';
                        }}
                        onMouseLeave={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'grab';
                        }}
                        onMouseDown={(e) => {
                            e.cancelBubble = true;
                            onLinkStart({ x: x + pos.x, y: y + pos.y });
                        }}
                    />
                ))}
            </Group>
        </Portal>
    );
});

// =============================================================================
// PART 3: MAIN COMPONENT
// =============================================================================

const GraphCanvasKonva = forwardRef<GraphCanvasKonvaRef, GraphCanvasKonvaProps>(({
    nodes, links, selectedIds, slices, swimlanePositions, showSlices,
    onNodeClick, onLinkClick, onNodeDoubleClick, onLinkDoubleClick, onNodesDrag,
    onAddLink, onCanvasClick, onMarqueeSelect, onValidateConnection, onViewChange,
    edgeRoutes, experimentalLayoutEnabled // Destructure the new prop here
}, ref) => {
    const stageRef = useRef<Konva.Stage>(null);
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [tempLink, setTempLink] = useState<{ sourceId: string; startPos: { x: number; y: number }; currentPos: { x: number; y: number } } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [validTargetIds, setValidTargetIds] = useState<Set<string>>(new Set());
    const [isHoveringNode, setIsHoveringNode] = useState(false);

    useEffect(() => {
        if (onViewChange) {
            onViewChange({ x: stagePos.x, y: stagePos.y, scale: stageScale });
        }
    }, [stagePos, stageScale, onViewChange]);

    useImperativeHandle(ref, () => ({
        panToNode: (nodeId: string) => {
            const node = nodes.find(n => n.id === nodeId);
            if (node && stageRef.current) {
                const stage = stageRef.current;
                const newScale = 1;
                // CHANGED: Pan to center of node (Top-Left + Half Size)
                const newX = -(safeNum(node.x) + NODE_WIDTH / 2) * newScale + stage.width() / 2;
                const newY = -(safeNum(node.y) + safeNum((node as any).computedHeight, MIN_NODE_HEIGHT) / 2) * newScale + stage.height() / 2;

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

        nodes.forEach(n => nodeMap.set(safeStr(n.id), n));
        links.forEach(l => {
            const s = safeStr(l.source);
            const t = safeStr(l.target);
            if (!linksByNode.has(s)) linksByNode.set(s, []);
            if (!linksByNode.has(t)) linksByNode.set(t, []);
            linksByNode.get(s)?.push(l);
            linksByNode.get(t)?.push(l);
        });

        return { nodeMap, linksByNode };
    }, [nodes, links]);

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

            connectedLinks.forEach(link => {
                const linkId = safeStr(link.id);
                if (edgeRoutes && edgeRoutes.has(linkId)) return;

                const sId = safeStr(link.source);
                const tId = safeStr(link.target);

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

                const sH = safeNum((sNode as any).computedHeight, MIN_NODE_HEIGHT);
                const tH = safeNum((tNode as any).computedHeight, MIN_NODE_HEIGHT);

                const points = calculatePoints(
                    { x: safeNum(sNode.x) + NODE_WIDTH / 2, y: safeNum(sNode.y) + sH / 2, h: sH },
                    { x: safeNum(tNode.x) + NODE_WIDTH / 2, y: safeNum(tNode.y) + tH / 2, h: tH }
                );

                const arrow = stage.findOne(`#link-arrow-${linkId}`);
                const line = stage.findOne(`#link-line-${linkId}`);
                const labelGroup = stage.findOne(`#link-label-group-${linkId}`);

                if (arrow instanceof Konva.Arrow) arrow.points(points);
                if (line instanceof Konva.Line) line.points(points);
                if (labelGroup instanceof Konva.Group) {
                    const midX = (points[2] + points[4]) / 2;
                    const midY = (points[3] + points[5]) / 2;
                    labelGroup.position({ x: midX, y: midY });
                }
            });
        });
    }, [lookup, edgeRoutes, selectedIds]);

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

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        const scaleBy = 1.1;
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        if (newScale < 0.1 || newScale > 5) return;
        const mousePointTo = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale };
        setStageScale(newScale);
        setStagePos({ x: pointer.x - mousePointTo.x * newScale, y: pointer.y - mousePointTo.y * newScale });
    }, []);

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage() || e.target.name() === 'grid-background') {
            if (e.evt.shiftKey && !showSlices) {
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
    }, [onCanvasClick, showSlices]);

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

    const safeData = useMemo(() => {
        const safeNodes: Node[] = [];
        const seenIds = new Set<string>();

        const shouldUseCalculatedPositions = (showSlices || experimentalLayoutEnabled) && swimlanePositions;

        // ---------------------------------------------------------
        // 1. Gather Nodes & Basic Safety
        // ---------------------------------------------------------
        if (Array.isArray(nodes)) {
            nodes.forEach(n => {
                if (n && typeof n === 'object' && !Array.isArray(n)) {
                    const id = safeStr(n.id);
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);

                        let x = safeNum(n.x);
                        let y = safeNum(n.y);

                        if (shouldUseCalculatedPositions) {
                            const pos = swimlanePositions.get(id);
                            if (pos) {
                                x = safeNum(pos.x);
                                y = safeNum(pos.y);
                            }
                        }

                        const computedHeight = calculateNodeHeight(safeStr(n.name));
                        safeNodes.push({ ...n, id, x, y, computedHeight });
                    }
                }
            });
        }

        // ---------------------------------------------------------
        // 2. Experimental Layout Calculation
        // ---------------------------------------------------------
        if (experimentalLayoutEnabled && showSlices) {
            const ZONE_HEIGHT = 300;
            const GAP = 50;
            const START_X = 100;

            const zones: Record<number, Node[]> = { 0: [], 300: [], 600: [] };

            // A. Snap Y to Zones
            safeNodes.forEach(node => {
                const closestZoneY = Math.round(safeNum(node.y) / ZONE_HEIGHT) * ZONE_HEIGHT;
                if (!zones[closestZoneY]) zones[closestZoneY] = [];
                zones[closestZoneY].push(node);
            });

            // B. Initial Horizontal Spread (Grid Layout)
            Object.keys(zones).forEach(key => {
                const zoneY = Number(key);
                const zoneNodes = zones[zoneY];
                if (zoneNodes.length === 0) return;

                // Sort by original X to maintain relative user order
                zoneNodes.sort((a, b) => safeNum(a.x) - safeNum(b.x));

                zoneNodes.forEach((node, index) => {
                    node.y = zoneY;
                    node.x = START_X + (index * (NODE_WIDTH + GAP));
                });
            });

            // ---------------------------------------------------------
            // 3. VERTICAL ALIGNMENT PASS (New!)
            // ---------------------------------------------------------
            const nodeMap = new Map(safeNodes.map(n => [n.id, n]));

            (links || []).forEach(link => {
                const source = nodeMap.get(safeStr(link.source));
                const target = nodeMap.get(safeStr(link.target));

                if (source && target) {
                    // 👇 FIX: Extract safe numbers here to satisfy TypeScript
                    const sy = safeNum(source.y);
                    const ty = safeNum(target.y);

                    // CASE 1: Top (Source) -> Middle (Target)
                    // e.g. Automation -> Command
                    if (Math.abs(sy - 0) < 50 && Math.abs(ty - 300) < 50) {
                        source.x = target.x; // Snap Parent to Child X
                    }

                    // CASE 2: Middle (Source) -> Top (Target)
                    // e.g. Read Model -> Automation
                    if (Math.abs(sy - 300) < 50 && Math.abs(ty - 0) < 50) {
                        target.x = source.x; // Snap Child to Parent X
                    }

                    // CASE 3: Middle (Source) -> Bottom (Target)
                    // e.g. Command -> Event
                    if (Math.abs(sy - 300) < 50 && Math.abs(ty - 600) < 50) {
                        target.x = source.x; // Snap Child to Parent X
                    }
                }
            });
        }

        const safeLinks = (links || []).filter(l => l && typeof l === 'object').filter(l => {
            const s = safeStr(l.source);
            const t = safeStr(l.target);
            return s && t && safeNodes.some(n => n.id === s) && safeNodes.some(n => n.id === t);
        });

        return { nodes: safeNodes, links: safeLinks };
    }, [nodes, links, showSlices, swimlanePositions, experimentalLayoutEnabled]);

    const handleMinimapNavigate = (x: number, y: number, k: number) => {
        if (stageRef.current) {
            stageRef.current.to({
                x,
                y,
                scaleX: k,
                scaleY: k,
                duration: 0.3
            });
            setStagePos({ x, y });
            setStageScale(k);
        }
    };

    return (
        <div className="w-full h-screen bg-gray-50 overflow-hidden relative">
            <Stage
                width={window.innerWidth}
                height={window.innerHeight}
                draggable={!tempLink && !marqueeStart && !isHoveringNode} // Allow pan even if slices are shown
                onWheel={handleWheel}
                scaleX={stageScale}
                scaleY={stageScale}
                x={stagePos.x}
                y={stagePos.y}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDragStart={(e) => {
                    if (e.target === e.target.getStage()) {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'grabbing';
                    }
                }}
                onDragEnd={(e) => {
                    if (e.target === e.target.getStage()) {
                        const stage = e.target.getStage();
                        if (stage) stage.container().style.cursor = 'default';
                        setStagePos({ x: e.target.x(), y: e.target.y() });
                    }
                }}
            >
                <Layer>
                    <Rect name="grid-background" x={-50000} y={-50000} width={100000} height={100000} fillPatternImage={gridImage || undefined} fillPatternOffset={{ x: 0, y: 0 }} fill={gridImage ? undefined : "#f9fafb"} />
                    {showSlices && (
                        <Group>
                            {experimentalLayoutEnabled ? (
                                <Group>
                                    {/* 1. Large Background Zones */}
                                    <Rect x={-50000} y={0} width={100000} height={200} fill="rgba(59, 130, 246, 0.05)" listening={false} />
                                    <Rect x={-50000} y={300} width={100000} height={200} fill="rgba(34, 197, 94, 0.05)" listening={false} />
                                    <Rect x={-50000} y={600} width={100000} height={200} fill="rgba(249, 115, 22, 0.05)" listening={false} />

                                    {/* 2. Fixed Sticky Labels */}
                                    <Text
                                        x={(20 - stagePos.x) / stageScale}
                                        y={10}
                                        text="TRIGGER / UI"
                                        fontSize={16} fontStyle="bold" fill="#3b82f6" opacity={0.8}
                                        scaleX={1 / stageScale} scaleY={1 / stageScale}
                                    />
                                    <Text
                                        x={(20 - stagePos.x) / stageScale}
                                        y={310}
                                        text="INTENTION / MODEL"
                                        fontSize={16} fontStyle="bold" fill="#22c55e" opacity={0.8}
                                        scaleX={1 / stageScale} scaleY={1 / stageScale}
                                    />
                                    <Text
                                        x={(20 - stagePos.x) / stageScale}
                                        y={610}
                                        text="FACTS / EVENTS"
                                        fontSize={16} fontStyle="bold" fill="#f97316" opacity={0.8}
                                        scaleX={1 / stageScale} scaleY={1 / stageScale}
                                    />

                                    {/* 3. Slice Bounding Boxes (Same as Standard View) */}
                                    {(slices || []).filter(s => s && typeof s === 'object').map((slice, i) => (
                                        <Group key={safeStr(slice.id) || i}>
                                            <Rect
                                                x={safeNum(slice.x)} y={safeNum(slice.y)}
                                                width={safeNum(slice.width)} height={safeNum(slice.height)}
                                                fill={slice.color} opacity={0.05} // Very light background
                                                stroke={slice.color} strokeWidth={2} dash={[5, 5]}
                                                cornerRadius={10}
                                            />
                                        </Group>
                                    ))}
                                </Group>
                            ) : (
                                <Group>
                                    {/* Standard Layout: Bounding Boxes */}
                                    {(slices || []).filter(s => s && typeof s === 'object').map((slice, i) => (
                                        <Group key={safeStr(slice.id) || i}>
                                            <Rect
                                                x={safeNum(slice.x)} y={safeNum(slice.y)}
                                                width={safeNum(slice.width)} height={safeNum(slice.height)}
                                                fill={slice.color} opacity={0.1}
                                                stroke={slice.color} strokeWidth={2} dash={[5, 5]}
                                            />
                                        </Group>
                                    ))}
                                </Group>
                            )}
                        </Group>
                    )}
                    <Group>
                        {safeData.links.map((link, i) => {
                            const source = safeData.nodes.find(n => n.id === link.source);
                            const target = safeData.nodes.find(n => n.id === link.target);
                            if (!source || !target) return null;

                            // 👇 CHECK FOR CUSTOM ROUTE FROM ELK
                            const route = edgeRoutes?.get(safeStr(link.id));

                            return <LinkGroup
                                key={safeStr(link.id) || `link-${i}`}
                                link={link}
                                sourceNode={source}
                                targetNode={target}
                                isSelected={selectedIds.includes(safeStr(link.id))}
                                onLinkClick={onLinkClick}
                                onLinkDoubleClick={onLinkDoubleClick}
                                customPoints={route} // <-- Pass it here
                            />;
                        })}
                    </Group>
                    <Group>
                        {safeData.nodes.map((node, i) => (
                            <NodeGroup
                                key={safeStr(node.id) || `node-${i}`}
                                node={node}
                                isSelected={selectedIds.includes(safeStr(node.id))}
                                isValidTarget={validTargetIds.has(safeStr(node.id))}
                                onNodeClick={onNodeClick}
                                onNodeDoubleClick={onNodeDoubleClick}
                                onDragMove={handleNodeDragMove}
                                onDragEnd={handleNodeDragEnd}
                                onLinkStart={(pos: any) => { setTempLink({ sourceId: safeStr(node.id), startPos: pos, currentPos: pos }); }}
                                onHoverChange={setIsHoveringNode}
                                stagePos={stagePos} // <-- Pass stagePos
                                stageScale={stageScale} // <-- Pass stageScale
                                isDraggable={!showSlices} // Disable dragging in Slice view
                            />
                        ))}
                    </Group>
                    {tempLink && <Line points={[safeNum(tempLink.startPos.x), safeNum(tempLink.startPos.y), safeNum(tempLink.currentPos.x), safeNum(tempLink.currentPos.y)]} stroke="#a855f7" strokeWidth={2} dash={[5, 5]} listening={false} />}
                    {marqueeRect && <Rect x={marqueeRect.x} y={marqueeRect.y} width={marqueeRect.width} height={marqueeRect.height} fill="rgba(79, 70, 229, 0.1)" stroke="#4f46e5" strokeWidth={1} />}
                </Layer>
                <Layer name="top-layer" />
            </Stage>
            <Minimap
                nodes={nodes}
                slices={slices}
                showSlices={showSlices}
                swimlanePositions={swimlanePositions}
                zoomTransform={{ k: stageScale, x: stagePos.x, y: stagePos.y }}
                onNavigate={handleMinimapNavigate}
                stageWidth={window.innerWidth}
                stageHeight={window.innerHeight}
            />
        </div>
    );
});

export default GraphCanvasKonva;