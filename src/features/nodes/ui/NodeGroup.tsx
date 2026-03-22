import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Group, Rect, Path, Text, Circle } from 'react-konva';
import { Portal } from 'react-konva-utils';
import Konva from 'konva';
import { Node, calculateNodeHeight } from '../../modeling';
import { ELEMENT_STYLE, NODE_WIDTH, GRID_SIZE, FONT_FAMILY, FONT_SIZE, LINE_HEIGHT, NODE_PADDING } from '../../../shared/constants';
import { safeNum, safeStr } from '../../canvas/domain/canvasUtils';
import { setCanvasCursor } from '../../canvas/domain/cursorUtils';

interface NodeGroupProps {
    node: Node;
    isSelected: boolean;
    isValidTarget: boolean;
    isInvalid?: boolean;
    validationMessage?: string;
    actorColor?: string;
    actorName?: string;
    aggregateName?: string;
    onNodeClick: (node: Node, event?: any) => void;
    onNodeDoubleClick: (node: Node) => void;
    onDragMove: (nodeId: string, x: number, y: number) => void;
    onDragEnd: (nodeId: string, x: number, y: number) => void;
    onLinkStart: (pos: { x: number; y: number }) => void;
    onRelationalAuraClick?: (node: Node) => void;
    onUnpin: (id: string) => void;
    stagePos: { x: number; y: number };
    stageScale: number;
    isDraggable: boolean;
}

// ─── Warning Badge SVG Path (Triangle with !) ────────────────────────
// Simplified 24x24 alert-triangle path
const ALERT_PATH = 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';

const NodeGroup = React.memo(({
    node,
    isSelected,
    isValidTarget,
    isInvalid,
    validationMessage,
    actorColor,
    actorName,
    aggregateName,
    onNodeClick,
    onNodeDoubleClick,
    onDragMove,
    onDragEnd,
    onLinkStart,
    onRelationalAuraClick,
    onUnpin,
    stagePos,
    stageScale,
    isDraggable
}: NodeGroupProps) => {
    const { t } = useTranslation();
    const defaultStyle = { color: 'gray', shape: 'rect', textColor: 'black' };
    const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE] || defaultStyle;

    const rawHeight = node.computedHeight || calculateNodeHeight(node.name);
    const height = Math.ceil(rawHeight / GRID_SIZE) * GRID_SIZE;
    const width = NODE_WIDTH;
    const x = safeNum(node.x);
    const y = safeNum(node.y);

    const [showAura, setShowAura] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [hoveredIcon, setHoveredIcon] = useState<'edit' | 'link' | 'unpin' | null>(null);
    const [showValidationTooltip, setShowValidationTooltip] = useState(false);

    const groupRef = useRef<Konva.Group>(null);

    const contentOffsetX = 0;
    const contentOffsetY = 0;

    const shadowEnabled = !isDragging;

    // Amber border for invalid nodes (subtle but noticeable)
    const invalidStroke = isInvalid && !isSelected && !isValidTarget;

    const shapeProps = {
        width,
        height,
        x: contentOffsetX,
        y: contentOffsetY,
        fill: style.color,
        stroke: isValidTarget ? '#22c55e' : (isSelected ? '#4f46e5' : (invalidStroke ? '#f59e0b' : undefined)),
        strokeWidth: isValidTarget ? 4 : (isSelected ? 3 : (invalidStroke ? 2 : 0)),
        shadowColor: shadowEnabled ? (isValidTarget ? '#22c55e' : 'black') : undefined,
        shadowBlur: shadowEnabled ? (isValidTarget ? 15 : (isSelected ? 8 : 4)) : 0,
        shadowOpacity: shadowEnabled ? (isValidTarget ? 0.6 : 0.2) : 0,
        shadowOffset: { x: 2, y: 3 },
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

    // ─── Tooltip dimensions ──────────────────────────────────────────
    const tooltipText = validationMessage || 'Information Incomplete';
    const messageLines = tooltipText.split('\n');
    const tooltipWidth = Math.min(280, Math.max(...messageLines.map(line => line.length * 6 + 24), 120));
    const tooltipHeight = 16 + (messageLines.length * 15);

    // Aura dimensions (slightly larger than the node)
    const auraPadding = 8;

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
                        onLinkStart({ x: x + width, y: y + height / 2 });
                    }
                }}
                onDragStart={(e) => {
                    if (!isDraggable) return;
                    setIsDragging(true);
                    setShowAura(false);
                    setCanvasCursor(e, 'grabbing');
                }}
                onDragMove={(e) => {
                    onDragMove(node.id, e.target.x(), e.target.y());
                }}
                onDragEnd={(e) => {
                    setIsDragging(false);
                    setCanvasCursor(e, 'grab');
                    onDragEnd(safeStr(node.id), e.target.x(), e.target.y());
                }}
                onClick={(e) => { e.cancelBubble = true; onNodeClick(node, e); }}
                onDblClick={(e) => { e.cancelBubble = true; onNodeDoubleClick(node); }}
                onMouseEnter={(e) => {
                    setCanvasCursor(e, 'grab');
                    setShowAura(true);
                }}
                onMouseLeave={(e) => {
                    setCanvasCursor(e, ''); // Fallback to canvas CSS
                    setShowAura(false);
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
                {/* ─── Padding Hit Box (bridges gap to handles) ──────── */}
                <Rect x={-15} y={-25} width={width + 45} height={height + 50} fill="transparent" listening={true} />
                <Rect x={contentOffsetX} y={contentOffsetY} width={width} height={height} fill="transparent" listening={true} perfectDrawEnabled={false} />
                
                {/* ─── Relational Aura (Selection/Hover feedback) ─────── */}
                {(showAura || isSelected) && (
                    <Rect
                        x={-auraPadding}
                        y={-auraPadding}
                        width={width + (auraPadding * 2)}
                        height={height + (auraPadding * 2)}
                        stroke={isSelected ? '#4f46e5' : '#94a3b8'}
                        strokeWidth={2}
                        opacity={isSelected ? 0.4 : 0.2}
                        cornerRadius={16}
                        listening={false}
                        perfectDrawEnabled={false}
                    />
                )}

                {renderShape()}
                <Text
                    x={contentOffsetX} y={contentOffsetY + 12} width={width}
                    text={`<<${safeStr(node.type).replace(/_/g, ' ')}>>`}
                    align="center" fontSize={12} opacity={0.8} fill={style.textColor}
                    listening={false}
                />
                <Text
                    x={contentOffsetX + NODE_PADDING} y={contentOffsetY + 30} width={width - NODE_PADDING * 2}
                    text={safeStr(node.name)}
                    align="center"
                    fontSize={FONT_SIZE}
                    fontFamily={FONT_FAMILY}
                    lineHeight={LINE_HEIGHT}
                    fontStyle="500"
                    fill={style.textColor}
                    wrap="word"
                    listening={false}
                />
                {node.pinned && (
                    <Group
                        x={-5}
                        y={-5}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onUnpin(node.id);
                        }}
                        onMouseEnter={(e) => {
                            setCanvasCursor(e, 'pointer');
                            setHoveredIcon('unpin');
                        }}
                        onMouseLeave={(e) => {
                            setCanvasCursor(e, '');
                            setHoveredIcon(null);
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

                {/* ─── Validation Warning Badge ──────────────────────── */}
                {isInvalid && (
                    <Group
                        x={width + 5}
                        y={height + 5}
                        onMouseEnter={(e) => {
                            setCanvasCursor(e, 'pointer');
                            setShowValidationTooltip(true);
                        }}
                        onMouseLeave={(e) => {
                            setCanvasCursor(e, '');
                            setShowValidationTooltip(false);
                        }}
                    >
                        {/* Pulsing glow behind the badge */}
                        <Circle
                            radius={16}
                            fill="#f59e0b"
                            opacity={0.3}
                            listening={false}
                        />
                        {/* Badge circle */}
                        <Circle
                            radius={12}
                            fill="#f59e0b"
                            stroke="white"
                            strokeWidth={2}
                            shadowBlur={4}
                            shadowColor="#f59e0b"
                            shadowOpacity={0.5}
                        />
                        {/* Alert triangle icon */}
                        <Path
                            data={ALERT_PATH}
                            fill="white"
                            scale={{ x: 0.7, y: 0.7 }}
                            offset={{ x: 12, y: 13 }}
                            listening={false}
                        />
                    </Group>
                )}

                {/* ─── Validation Tooltip (Konva-native) ─────────────── */}
                {isInvalid && showValidationTooltip && (
                    <Group
                        x={width / 2 - tooltipWidth / 2}
                        y={height + 10}
                    >
                        <Rect
                            width={tooltipWidth}
                            height={tooltipHeight}
                            fill="#ffffff"
                            cornerRadius={6}
                            shadowBlur={8}
                            shadowColor="black"
                            shadowOpacity={0.08}
                            shadowOffsetY={2}
                            stroke="#e2e8f0"
                            strokeWidth={1}
                            listening={false}
                        />
                        <Text
                            x={8}
                            y={8}
                            width={tooltipWidth - 16}
                            text={tooltipText}
                            fontSize={11}
                            fontFamily={FONT_FAMILY}
                            fill="#0f172a"
                            wrap="word"
                            listening={false}
                        />
                    </Group>
                )}

                {/* Actor Label */}
                {actorName && (
                    <Group x={12} y={-22}>
                        <Rect
                            height={20}
                            width={Math.min(100, actorName.length * 8 + 12)}
                            fill={actorColor || '#9333ea'}
                            cornerRadius={4}
                            shadowBlur={2}
                            shadowOpacity={0.1}
                        />
                        <Text
                            text={actorName}
                            fontSize={10}
                            fontFamily={FONT_FAMILY}
                            fontStyle="bold"
                            fill="white"
                            padding={5}
                            width={100}
                            ellipsis={true}
                            wrap="none"
                        />
                    </Group>
                )}
                {/* Aggregate Label */}
                {aggregateName && node.type === 'DOMAIN_EVENT' && (
                    <Group x={12} y={-22}>
                        <Rect
                            height={20}
                            width={Math.min(100, aggregateName.length * 8 + 12)}
                            fill={'#ea580c'} // Tailwind Orange-600
                            cornerRadius={4}
                            shadowBlur={2}
                            shadowOpacity={0.1}
                        />
                        <Text
                            text={aggregateName}
                            fontSize={10}
                            fontFamily={FONT_FAMILY}
                            fontStyle="bold"
                            fill="white"
                            padding={5}
                            width={100}
                            ellipsis={true}
                            wrap="none"
                        />
                    </Group>
                )}

                {/* ─── Relationship Link Handle ──────────────────────── */}
                {(showAura || isSelected) && (
                    <Group
                        x={width + 5}
                        y={height / 2}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            // Ensure node is selected for the jump to work
                            onNodeClick(node);
                            onRelationalAuraClick?.(node);
                        }}
                        onMouseDown={(e) => {
                            // Only cancel bubble if we want to block the NodeGroup's own drag
                            // But handle group is not draggable. Leaving it for now but ensuring onLinkStart
                            e.cancelBubble = true; 
                            onLinkStart({ x: x + width, y: y + height / 2 });
                        }}
                        onMouseEnter={(e) => {
                            setCanvasCursor(e, 'crosshair');
                            setHoveredIcon('link');
                        }}
                        onMouseLeave={(e) => {
                            setCanvasCursor(e, '');
                            setHoveredIcon(null);
                        }}
                    >
                        <Circle 
                            radius={14} 
                            fill={hoveredIcon === 'link' ? "#a855f7" : "#4f46e5"} 
                            shadowBlur={4} 
                            shadowOpacity={0.3} 
                            stroke="white" 
                            strokeWidth={2} 
                        />
                        <Group scale={{ x: 0.7, y: 0.7 }} offset={{ x: 12, y: 12 }} listening={false}>
                            <Path data="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="white" strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                            <Path data="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="white" strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                        </Group>
                    </Group>
                )}

                {/* ─── Edit Handle ──────────────────────────────────── */}
                {(isSelected || showAura) && (
                    <Group
                        x={width + 5}
                        y={-5}
                        onClick={(e) => {
                            e.cancelBubble = true;
                            onNodeDoubleClick(node);
                        }}
                        onMouseEnter={(e) => {
                            setCanvasCursor(e, 'pointer');
                            setHoveredIcon('edit');
                        }}
                        onMouseLeave={(e) => {
                            setCanvasCursor(e, '');
                            setHoveredIcon(null);
                        }}
                    >
                        <Circle 
                            radius={14} 
                            fill={hoveredIcon === 'edit' ? "#a855f7" : "#4f46e5"} 
                            shadowBlur={4} 
                            shadowOpacity={0.3} 
                            stroke="white" 
                            strokeWidth={2} 
                        />
                        <Group scale={{ x: 0.7, y: 0.7 }} offset={{ x: 12, y: 12 }} listening={false}>
                            <Path data="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke="white" strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                            <Path data="m15 5 4 4" stroke="white" strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                        </Group>
                    </Group>
                )}

                {/* ─── Node Control Tooltips ────────────────────────── */}
                {hoveredIcon && !isDragging && (
                    <Group
                        x={hoveredIcon === 'unpin' ? -75 : width + 30}
                        y={hoveredIcon === 'edit' ? -5 : hoveredIcon === 'unpin' ? -40 : height / 2}
                    >
                        <Rect
                            width={hoveredIcon === 'unpin' ? 140 : 220}
                            height={28}
                            fill="#ffffff"
                            cornerRadius={6}
                            shadowBlur={8}
                            shadowColor="black"
                            shadowOpacity={0.08}
                            shadowOffsetY={2}
                            stroke="#e2e8f0"
                            strokeWidth={1}
                        />
                        <Text
                            text={hoveredIcon === 'edit' ? t('canvas.editHint') : hoveredIcon === 'link' ? t('canvas.linkHint') : t('canvas.unpinHint')}
                            fill="#0f172a"
                            fontSize={11}
                            fontStyle="500"
                            padding={8}
                            fontFamily={FONT_FAMILY}
                            listening={false}
                        />
                    </Group>
                )}
            </Group>
        </Portal>
    );
});

export default NodeGroup;
