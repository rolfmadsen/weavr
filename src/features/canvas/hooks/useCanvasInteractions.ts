import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Konva from 'konva';
import { Node, Link } from '../../modeling';
import { GRID_SIZE } from '../../../shared/constants';
import { safeNum, safeStr, getPolylineMidpoint } from '../utils/canvasUtils';
import { resolveLinkPoints } from '../utils/routing';

interface UseCanvasInteractionsProps {
    stageRef: React.RefObject<Konva.Stage>;
    gridRectRef: React.RefObject<Konva.Rect>;
    nodes: Node[];
    links: Link[];
    selectedIds: string[];
    onCanvasClick: (event: any) => void;
    onMarqueeSelect: (nodeIds: string[]) => void;
    onViewChange?: (view: { x: number, y: number, scale: number, width: number, height: number }) => void;
    onAddLink: (sourceId: string, targetId: string) => void;
    onValidateConnection?: (source: Node, target: Node) => boolean;
    onNodesDrag: (updates: { nodeId: string; pos: { x: number; y: number } }[]) => void;
    updateVisibleNodes: (immediate?: boolean) => void;
    sliceBounds: Map<string, { minX: number; maxX: number; minY: number; maxY: number }>;
}

export function useCanvasInteractions({
    stageRef,
    gridRectRef,
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
}: UseCanvasInteractionsProps) {
    const [stageScale, setStageScale] = useState(1);
    const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
    const [tempLink, setTempLink] = useState<{ sourceId: string; startPos: { x: number; y: number }; currentPos: { x: number; y: number } } | null>(null);
    const [marqueeStart, setMarqueeStart] = useState<{ x: number; y: number } | null>(null);
    const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
    const [validTargetIds, setValidTargetIds] = useState<Set<string>>(new Set());

    const dragDistance = useRef(0);
    const lastDragPos = useRef({ x: 0, y: 0 });

    const lookup = useMemo(() => {
        const nodeMap = new Map<string, Node>();
        const linksByNode = new Map<string, Link[]>();

        nodes.forEach(n => nodeMap.set(n.id, n));
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

    const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
        if (newScale < 0.05 || newScale > 10) return;

        stage.scale({ x: newScale, y: newScale });

        const newPos = {
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        };

        stage.position(newPos);
        setStageScale(newScale);
        setStagePos(newPos);
        updateVisibleNodes();

        onViewChange?.({ ...newPos, scale: newScale, width: stage.width(), height: stage.height() });
    }, [stageRef, updateVisibleNodes, onViewChange]);

    const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
        if (e.target === e.target.getStage()) {
            const stage = stageRef.current;
            if (stage && gridRectRef.current) {
                const x = stage.x();
                const y = stage.y();
                const scale = stage.scaleX();

                const stageX = -x / scale;
                const stageY = -y / scale;

                const rect = gridRectRef.current;
                rect.position({ x: stageX, y: stageY });
                rect.width(stage.width() / scale);
                rect.height(stage.height() / scale);
                rect.fillPatternOffset({
                    x: stageX % (GRID_SIZE || 20),
                    y: stageY % (GRID_SIZE || 20)
                });
            }

            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                const dist = Math.sqrt(Math.pow(pos.x - lastDragPos.current.x, 2) + Math.pow(pos.y - lastDragPos.current.y, 2));
                dragDistance.current += dist;
                lastDragPos.current = pos;
            }
        }
    }, [stageRef, gridRectRef]);

    const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage() || e.target.name() === 'grid-background') {
            const pos = e.target.getStage()?.getPointerPosition();
            if (pos) {
                lastDragPos.current = pos;
                dragDistance.current = 0;
            }

            if (e.evt.shiftKey) {
                const stage = stageRef.current;
                if (stage) {
                    const pointer = (stage as any).getRelativePointerPosition();
                    if (pointer) {
                        setMarqueeStart(pointer);
                        setMarqueeRect({ x: pointer.x, y: pointer.y, width: 0, height: 0 });
                    }
                }
            }
        }
    }, [stageRef]);

    const handleMouseMove = useCallback(() => {
        const stage = stageRef.current;
        if (!stage) return;
        const pointer = (stage as any).getRelativePointerPosition();
        if (!pointer) return;

        if (tempLink) {
            let snappedPos = pointer;

            // Magnetic Snapping to closest handle of ANY node under pointer
            const pointerPos = stage.getPointerPosition();
            const shape = pointerPos ? stage.getIntersection(pointerPos) : null;
            if (shape) {
                let group: any = shape.getParent();
                while (group && group !== stage) {
                    if (group.attrs.id && group.attrs.id.startsWith('node-')) {
                        const nodeId = group.attrs.id.replace('node-', '');
                        const node = lookup.nodeMap.get(nodeId);
                        if (node) {
                            const nodeX = safeNum(node.x);
                            const nodeY = safeNum(node.y);
                            const nodeH = node.computedHeight || 60;
                            const nodeW = 180; // NODE_WIDTH

                            // 4 handles
                            const handles = [
                                { x: nodeX + nodeW / 2, y: nodeY },            // Top
                                { x: nodeX + nodeW, y: nodeY + nodeH / 2 },   // Right
                                { x: nodeX + nodeW / 2, y: nodeY + nodeH },   // Bottom
                                { x: nodeX, y: nodeY + nodeH / 2 }            // Left
                            ];

                            // Find closest
                            let minDist = Infinity;
                            handles.forEach(h => {
                                const d = Math.pow(h.x - pointer.x, 2) + Math.pow(h.y - pointer.y, 2);
                                if (d < minDist) {
                                    minDist = d;
                                    snappedPos = h;
                                }
                            });
                        }
                        break;
                    }
                    group = group.getParent();
                }
            }

            setTempLink(prev => prev ? { ...prev, currentPos: snappedPos } : null);
        } else if (marqueeStart) {
            setMarqueeRect({
                x: Math.min(marqueeStart.x, pointer.x),
                y: Math.min(marqueeStart.y, pointer.y),
                width: Math.abs(pointer.x - marqueeStart.x),
                height: Math.abs(pointer.y - marqueeStart.y),
            });
        }
    }, [stageRef, tempLink, marqueeStart]);

    const handleMouseUp = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        if ((e.target === e.target.getStage() || e.target.name() === 'grid-background') && dragDistance.current < 5) {
            if (!marqueeStart) {
                onCanvasClick(e);
            }
        }

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
                const x = safeNum(node.x);
                const y = safeNum(node.y);
                if (x >= marqueeRect.x && x <= marqueeRect.x + marqueeRect.width && y >= marqueeRect.y && y <= marqueeRect.y + marqueeRect.height) {
                    selected.push(safeStr(node.id));
                }
            });
            onMarqueeSelect(selected);
            setMarqueeStart(null);
            setMarqueeRect(null);
        }
    }, [stageRef, tempLink, marqueeStart, marqueeRect, nodes, onCanvasClick, onAddLink, onMarqueeSelect]);

    const handleNodeDragMove = useCallback((nodeId: string, x: number, y: number) => {
        const stage = stageRef.current;
        if (!stage) return;

        const primaryNode = lookup.nodeMap.get(nodeId);
        const dx = primaryNode ? x - safeNum(primaryNode.x) : 0;
        const dy = primaryNode ? y - safeNum(primaryNode.y) : 0;

        const nodesToUpdate = new Set<string>();
        if (selectedIds.includes(nodeId)) {
            selectedIds.forEach(id => nodesToUpdate.add(id));
        } else {
            nodesToUpdate.add(nodeId);
        }

        nodesToUpdate.forEach(movingNodeId => {
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
                const sId = safeStr(link.source);
                const tId = safeStr(link.target);

                const sNodeRaw = lookup.nodeMap.get(sId);
                const tNodeRaw = lookup.nodeMap.get(tId);
                if (!sNodeRaw || !tNodeRaw) return;

                const sNode = nodesToUpdate.has(sId)
                    ? { ...sNodeRaw, x: safeNum(sNodeRaw.x) + dx, y: safeNum(sNodeRaw.y) + dy }
                    : sNodeRaw;

                const tNode = nodesToUpdate.has(tId)
                    ? { ...tNodeRaw, x: safeNum(tNodeRaw.x) + dx, y: safeNum(tNodeRaw.y) + dy }
                    : tNodeRaw;

                const points = resolveLinkPoints(sNode as any, tNode as any, sliceBounds, undefined);

                const arrow = stage.findOne(`#link-arrow-${linkId}`);
                const line = stage.findOne(`#link-line-${linkId}`);
                const labelGroup = stage.findOne(`#link-label-group-${linkId}`);

                if (arrow instanceof Konva.Arrow) arrow.points(points);
                if (line instanceof Konva.Line) line.points(points);
                if (labelGroup instanceof Konva.Group) {
                    const mid = getPolylineMidpoint(points);
                    labelGroup.position({ x: mid.x, y: mid.y });
                }
            });
        });

        stage.batchDraw();
    }, [stageRef, lookup, selectedIds, sliceBounds]);

    const handleNodeDragEnd = useCallback((nodeId: string, x: number, y: number) => {
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
    }, [lookup, selectedIds, onNodesDrag]);

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

    return {
        stageScale, setStageScale,
        stagePos, setStagePos,
        tempLink, setTempLink,
        marqueeStart, setMarqueeStart,
        marqueeRect, setMarqueeRect,
        validTargetIds,
        handleWheel,
        handleDragMove,
        handleMouseDown,
        handleMouseMove,
        handleMouseUp,
        handleNodeDragMove,
        handleNodeDragEnd,
        lookup
    };
}
