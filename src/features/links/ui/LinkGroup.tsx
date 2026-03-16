import React from 'react';
import { useTheme } from '../../../shared/providers/ThemeProvider';
import { Group, Line, Arrow, Text } from 'react-konva';
import { Link, Node } from '../../modeling';
import { safeStr, getPolylineMidpoint, pointsAreEqual } from '../../canvas/domain/canvasUtils';

interface LinkGroupProps {
    link: Link;
    sourceNode: Node;
    targetNode: Node;
    isSelected: boolean;
    isHighlighted: boolean;
    onLinkClick: (link: Link) => void;
    onLinkDoubleClick: (link: Link) => void;
    customPoints: number[];
    flowLabel?: string;
}

const LinkGroup = React.memo(({
    link,
    sourceNode: _sourceNode,
    targetNode: _targetNode,
    isSelected,
    isHighlighted,
    onLinkClick,
    onLinkDoubleClick,
    customPoints,
    flowLabel
}: LinkGroupProps) => {
    const { resolvedTheme } = useTheme();
    const points = customPoints || [0, 0, 0, 0];
    const { x: midX, y: midY } = getPolylineMidpoint(points);

    const label = safeStr(link.label);
    const linkId = safeStr(link.id);

    const active = isSelected || isHighlighted;
    const color = active ? '#dc2626' : (resolvedTheme === 'dark' ? '#94a3b8' : '#6b7280');
    const width = active ? 4 : 2;

    const labelStroke = resolvedTheme === 'dark' ? '#0f172a' : '#f9fafb';
    const labelFill = active ? '#dc2626' : (resolvedTheme === 'dark' ? '#e2e8f0' : '#4b5563');
    const flowLabelFill = resolvedTheme === 'dark' ? '#64748b' : '#94a3b8'; // Subtle gray

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
                pointerLength={10}
                pointerWidth={10}
                listening={false}
                perfectDrawEnabled={false}
            />
            
            {/* Manual Label */}
            {label && (
                <Group id={`link-label-group-${linkId}`} x={midX || 0} y={midY || 0}>
                    <Text
                        text={label}
                        fontSize={12}
                        fill={labelFill}
                        align="center"
                        verticalAlign="middle"
                        offsetX={60}
                        offsetY={flowLabel ? 25 : 15}
                        width={120}
                        height={30}
                        stroke={labelStroke}
                        strokeWidth={3}
                        listening={false}
                    />
                    <Text
                        text={label}
                        fontSize={12}
                        fill={labelFill}
                        align="center"
                        verticalAlign="middle"
                        offsetX={60}
                        offsetY={flowLabel ? 25 : 15}
                        width={120}
                        height={30}
                        listening={false}
                    />
                </Group>
            )}

            {/* Flow Label (Secondary/Small) */}
            {flowLabel && (
                <Group id={`link-flow-group-${linkId}`} x={midX || 0} y={midY || 0}>
                    <Text
                        text={flowLabel}
                        fontSize={9}
                        fontStyle="italic"
                        fill={flowLabelFill}
                        align="center"
                        verticalAlign="middle"
                        offsetX={100}
                        offsetY={label ? 0 : 15}
                        width={200}
                        height={30}
                        stroke={labelStroke}
                        strokeWidth={2}
                        listening={false}
                    />
                    <Text
                        text={flowLabel}
                        fontSize={9}
                        fontStyle="italic"
                        fill={flowLabelFill}
                        align="center"
                        verticalAlign="middle"
                        offsetX={100}
                        offsetY={label ? 0 : 15}
                        width={200}
                        height={30}
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
}, (prev, next) => {
    return (
        prev.link === next.link &&
        prev.sourceNode === next.sourceNode &&
        prev.targetNode === next.targetNode &&
        prev.isSelected === next.isSelected &&
        prev.isHighlighted === next.isHighlighted &&
        prev.flowLabel === next.flowLabel &&
        pointsAreEqual(prev.customPoints, next.customPoints)
    );
});

export default LinkGroup;
