import React from 'react';
import { Group, Rect, Text, Path } from 'react-konva';
import { Slice } from '../../modeling';
import { setCanvasCursor } from '../../canvas/domain/cursorUtils';

interface SliceGroupProps {
    slice: Slice;
    onSliceClick?: (slice: Slice) => void;
    finalBounds?: { x: number, y: number, width: number, height: number };
}

const SliceGroup: React.FC<SliceGroupProps> = ({ slice, onSliceClick, finalBounds }) => {
    if (!finalBounds) return null;

    return (
        <Group>
            {/* Slice Stapled Border */}
            <Rect
                x={finalBounds.x}
                y={finalBounds.y}
                width={finalBounds.width}
                height={finalBounds.height}
                stroke="#475569" // Unified Slate 600
                strokeWidth={2}
                dash={[10, 5]} // Classic "Stapled" Dashed look
                cornerRadius={12}
                opacity={0.8}
                listening={false}
            // Background fill removed as requested
            />
            <Group
                x={finalBounds.x}
                y={finalBounds.y - 30}
                onClick={() => onSliceClick?.(slice)}
                onTap={() => onSliceClick?.(slice)}
                onMouseEnter={(e) => {
                    setCanvasCursor(e, 'pointer');
                }}
                onMouseLeave={(e) => {
                    setCanvasCursor(e, '');
                }}
            >
                <Text
                    x={0}
                    y={0}
                    width={finalBounds.width}
                    text={slice.title || 'Untitled Slice'}
                    fontSize={14}
                    fontStyle="bold"
                    fill="#475569" // Slate 600
                    align="center"
                />
                <Path
                    data="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    fill="#6366f1"
                    scale={{ x: 0.6, y: 0.6 }}
                    x={finalBounds.width / 2 + ((slice.title || '').length * 4) + 10}
                    y={-2}
                />
            </Group>
        </Group>
    );
};

export default SliceGroup;
