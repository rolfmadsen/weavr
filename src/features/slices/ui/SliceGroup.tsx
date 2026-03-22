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
    const [isHovered, setIsHovered] = React.useState(false);
    if (!finalBounds) return null;

    const textWidthEstimate = (slice.title || '').length * 7;

    return (
        <Group
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
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
                opacity={isHovered ? 1 : 0.8}
                listening={false}
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
                <Group 
                    x={(finalBounds.width / 2) + (textWidthEstimate / 2) + 10} 
                    y={-4} 
                    scale={{ x: 0.75, y: 0.75 }} 
                    opacity={isHovered ? 1 : 0.4}
                >
                    <Path data="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" stroke={isHovered ? "#a855f7" : "#475569"} strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                    <Path data="m15 5 4 4" stroke={isHovered ? "#a855f7" : "#475569"} strokeWidth={2.5} lineCap="round" lineJoin="round" fillEnabled={false} />
                </Group>
            </Group>
        </Group>
    );
};

export default SliceGroup;
