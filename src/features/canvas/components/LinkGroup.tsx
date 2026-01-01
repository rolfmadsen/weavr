import React from 'react';
import { Group, Line, Arrow, Text } from 'react-konva';
import { Link } from '../../modeling';
import { safeStr, getPolylineMidpoint, pointsAreEqual } from '../utils/canvasUtils';

interface LinkGroupProps {
    link: Link;
    sourceNode: any;
    targetNode: any;
    isSelected: boolean;
    isHighlighted: boolean;
    onLinkClick: (link: Link) => void;
    onLinkDoubleClick: (link: Link) => void;
    customPoints: number[];
}

const LinkGroup = React.memo(({
    link,
    sourceNode: _sourceNode,
    targetNode: _targetNode,
    isSelected,
    isHighlighted,
    onLinkClick,
    onLinkDoubleClick,
    customPoints
}: LinkGroupProps) => {
    const points = customPoints || [0, 0, 0, 0];
    const { x: midX, y: midY } = getPolylineMidpoint(points);

    const label = safeStr(link.label);
    const linkId = safeStr(link.id);

    const active = isSelected || isHighlighted;
    const color = active ? '#dc2626' : '#9ca3af';
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
    return (
        prev.link === next.link &&
        prev.sourceNode === next.sourceNode &&
        prev.targetNode === next.targetNode &&
        prev.isSelected === next.isSelected &&
        prev.isHighlighted === next.isHighlighted &&
        pointsAreEqual(prev.customPoints, next.customPoints)
    );
});

export default LinkGroup;
