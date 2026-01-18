import React, { useState, useEffect, useRef } from 'react';
import { Group, Rect, Path, Text, Circle } from 'react-konva';
import { Portal } from 'react-konva-utils';
import Konva from 'konva';
import { Node, calculateNodeHeight } from '../../modeling';
import { ELEMENT_STYLE, NODE_WIDTH, GRID_SIZE, FONT_FAMILY, FONT_SIZE, LINE_HEIGHT, NODE_PADDING } from '../../../shared/constants';
import { safeNum, safeStr } from '../domain/canvasUtils';

interface NodeGroupProps {
    node: Node;
    isSelected: boolean;
    isValidTarget: boolean;
    onNodeClick: (node: Node, event?: any) => void;
    onNodeDoubleClick: (node: Node) => void;
    onDragMove: (nodeId: string, x: number, y: number) => void;
    onDragEnd: (nodeId: string, x: number, y: number) => void;
    onLinkStart: (pos: { x: number; y: number }) => void;
    onUnpin: (id: string) => void;
    stagePos: { x: number; y: number };
    stageScale: number;
    isDraggable: boolean;
}

const NodeGroup = React.memo(({
    node,
    isSelected,
    isValidTarget,
    onNodeClick,
    onNodeDoubleClick,
    onDragMove,
    onDragEnd,
    onLinkStart,
    onUnpin,
    stagePos,
    stageScale,
    isDraggable
}: NodeGroupProps) => {
    // ... (rest of logic follows)
    const defaultStyle = { color: 'gray', shape: 'rect', textColor: 'black' };

    // ... (abridged for locator)
    const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE] || defaultStyle;

    const height = node.computedHeight || calculateNodeHeight(node.name);
    const width = NODE_WIDTH;
    const x = safeNum(node.x);
    const y = safeNum(node.y);

    const [showHandles, setShowHandles] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const groupRef = useRef<Konva.Group>(null);

    // PERFORMANCE: Cache the node group to reduce draw calls
    useEffect(() => {
        const group = groupRef.current;
        if (!group) return;

        if (isDragging) {
            group.clearCache();
            return;
        }

        const timeout = setTimeout(() => {
            if (groupRef.current) {
                groupRef.current.cache({
                    offset: 20
                });
            }
        }, 0);

        return () => clearTimeout(timeout);
    }, [node.name, node.type, node.pinned, isSelected, isValidTarget, showHandles, height, isDragging]);

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

    const handlePositions = [
        { x: width / 2, y: 0 },          // Top
        { x: width, y: height / 2 },     // Right
        { x: width / 2, y: height },     // Bottom
        { x: 0, y: height / 2 }          // Left
    ];

    return (
        <Portal selector=".top-layer" enabled={isDragging}>
            <Group
                ref={groupRef}
                id={`node-${safeStr(node.id)}`}
                x={x}
                y={y}
                draggable={isDraggable}
                onMouseDown={(e) => {
                    if (e.evt.altKey) {
                        e.cancelBubble = true;
                        // Use the Stage's relative pointer pos to find where we clicked
                        const stage = e.target.getStage();
                        const pointer = stage ? (stage as any).getRelativePointerPosition() : null;
                        if (pointer) {
                            const localX = pointer.x - x;
                            const localY = pointer.y - y;

                            // Find closest predefined handle
                            let minDist = Infinity;
                            let closest = handlePositions[0];
                            handlePositions.forEach(pos => {
                                const dist = Math.pow(pos.x - localX, 2) + Math.pow(pos.y - localY, 2);
                                if (dist < minDist) {
                                    minDist = dist;
                                    closest = pos;
                                }
                            });

                            onLinkStart({ x: x + closest.x, y: y + closest.y });
                        }
                    }
                }}
                onDragStart={(e) => {
                    if (!isDraggable) return;
                    setIsDragging(true);
                    setShowHandles(false);
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
                    const gridSize = GRID_SIZE || 20;
                    const scale = stageScale || 1;
                    const stageX = stagePos?.x || 0;
                    const stageY = stagePos?.y || 0;

                    const worldX = (pos.x - stageX) / scale;
                    const worldY = (pos.y - stageY) / scale;

                    const snappedWorldX = Math.round(worldX / gridSize) * gridSize;
                    const snappedWorldY = Math.round(worldY / gridSize) * gridSize;

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
                {node.pinned && (
                    <Group
                        x={15}
                        y={15}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onUnpin(node.id);
                        }}
                        onMouseEnter={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'grab';
                        }}
                    >
                        <Circle radius={14} fill="#ef4444" shadowBlur={4} shadowOpacity={0.3} stroke="white" strokeWidth={2} />
                        <Path
                            data="M16 9V4l1 1V2H7v2l1 1v5c0 2.18-1.79 4-4 4v2h7v9l1 1 1-1v-9h7v-2c-2.21 0-4-1.81-4-4z"
                            fill="white"
                            scale={{ x: 0.7, y: 0.7 }}
                            offset={{ x: 12, y: 12 }}
                            listening={false}
                        />
                    </Group>
                )}
                {isSelected && (
                    <Group
                        x={width - 15}
                        y={15}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onNodeDoubleClick(node);
                        }}
                        onMouseEnter={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'pointer';
                        }}
                        onMouseLeave={(e) => {
                            const stage = e.target.getStage();
                            if (stage) stage.container().style.cursor = 'grab';
                        }}
                    >
                        <Circle radius={14} fill="#4f46e5" shadowBlur={4} shadowOpacity={0.3} stroke="white" strokeWidth={2} />
                        <Path
                            data="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                            fill="white"
                            scale={{ x: 0.7, y: 0.7 }}
                            offset={{ x: 12, y: 12 }}
                            listening={false}
                        />
                    </Group>
                )}
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

export default NodeGroup;
