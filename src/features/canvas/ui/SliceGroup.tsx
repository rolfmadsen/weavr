import React, { useMemo } from 'react';
import { Group, Rect, Text, Path } from 'react-konva';
import { Slice, Node } from '../../modeling';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../../../shared/constants';
import { setCanvasCursor } from '../domain/cursorUtils';

interface SliceGroupProps {
    slice: Slice;
    nodes: Node[];
    onSliceClick?: (slice: Slice) => void;
}

const SliceGroup: React.FC<SliceGroupProps> = ({ slice, nodes, onSliceClick }) => {


    const bounds = useMemo(() => {
        if (nodes.length === 0) return null;

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        nodes.forEach(node => {
            const x = node.x ?? 0;
            const y = node.y ?? 0;
            const w = NODE_WIDTH;
            const h = node.computedHeight || MIN_NODE_HEIGHT;

            const left = x;
            const top = y;
            const right = x + w;
            const bottom = y + h;

            if (left < minX) minX = left;
            if (top < minY) minY = top;
            if (right > maxX) maxX = right;
            if (bottom > maxY) maxY = bottom;
        });

        const padding = 40;
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
            <Rect
                x={bounds.x}
                y={bounds.y}
                width={bounds.width}
                height={bounds.height}
                stroke={(!slice.color || slice.color === '#e5e7eb') ? '#9ca3af' : slice.color}
                strokeWidth={2}
                dash={[10, 5]}
                cornerRadius={8}
                opacity={0.8}
                listening={false}
            />
            <Group
                x={bounds.x}
                y={bounds.y - 30}
                onClick={() => onSliceClick?.(slice)}
                onTap={() => onSliceClick?.(slice)}
                onMouseEnter={(e) => {
                    setCanvasCursor(e, 'pointer');
                }}
                onMouseLeave={(e) => {
                    setCanvasCursor(e, 'grab');
                }}
            >
                <Text
                    x={0}
                    y={0}
                    width={bounds.width}
                    text={slice.title || 'Untitled Slice'}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#374151"
                    align="center"
                />
                <Path
                    data="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    fill="#6366f1"
                    scale={{ x: 0.6, y: 0.6 }}
                    x={bounds.width / 2 + ((slice.title || '').length * 4) + 10}
                    y={-2}
                />
            </Group>
        </Group>
    );
};

export default SliceGroup;
