import React, { useState } from 'react';
import { Group, Text, Rect, Path } from 'react-konva';
import { Html } from 'react-konva-utils';
import { Slice } from '../../modeling';
// import { default as validationService } from '../../modeling/domain/validation';
import { setCanvasCursor } from '../domain/cursorUtils';

interface ChapterGroupProps {
    chapterName: string;
    slices: Slice[];
    sliceBounds: Map<string, { minX: number, maxX: number, minY: number, maxY: number }>;
    onRenameChapter?: (sub: string, newName: string) => void;
}

const ChapterGroup: React.FC<ChapterGroupProps> = ({
    chapterName,
    slices,
    sliceBounds,
    onRenameChapter
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(chapterName);

    // 1. Calculate Chapter Bounds union of all slice bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let hasValidBounds = false;

    slices.forEach(slice => {
        const bounds = sliceBounds.get(slice.id);
        if (bounds && bounds.minX !== Infinity) {
            hasValidBounds = true;
            minX = Math.min(minX, bounds.minX);
            maxX = Math.max(maxX, bounds.maxX);
            minY = Math.min(minY, bounds.minY);
            maxY = Math.max(maxY, bounds.maxY);
        }
    });

    if (!hasValidBounds) return null;

    // Add padding (matches SliceGroup)
    const PADDING = 40;
    minX -= PADDING;
    minY -= PADDING; // Visual top padding
    maxX += PADDING;
    maxY += PADDING;

    // Extra vertical buffer for nested visual hierarchy (Chapters wrap slices)
    // Chapters should be slightly larger/outer than slices.
    const NESTING_BUFFER = 40;
    minX -= NESTING_BUFFER;
    minY -= NESTING_BUFFER;
    maxX += NESTING_BUFFER;
    maxY += NESTING_BUFFER;

    const width = maxX - minX;
    const height = maxY - minY;

    const handleRenameSubmit = () => {
        if (editName.trim() && editName !== chapterName && onRenameChapter) {
            onRenameChapter(chapterName, editName.trim());
        }
        setIsEditing(false);
    };

    const textWidthEstimate = (chapterName || '').length * 8; // Approx width

    return (
        <Group
            onMouseEnter={(e) => {
                setIsHovered(true);
                setCanvasCursor(e, 'pointer');
            }}
            onMouseLeave={(e) => {
                setIsHovered(false);
                setCanvasCursor(e, 'grab');
            }}
        >
            {/* Dashed "Stapled" Border - Matching SliceGroup Style */}
            <Rect
                x={minX}
                y={minY}
                width={width}
                height={height}
                stroke="#475569" // Slate 600 (Darker than Slice's #9ca3af)
                strokeWidth={2}
                dash={[15, 10]} // Slightly looser dash logic for "Outer" container
                cornerRadius={16} // Larger radius for outer container
                opacity={0.8}
                listening={false}
            />

            {/* Header Label - Centered like SliceGroup */}
            {!isEditing ? (
                <Group
                    x={minX}
                    y={minY - 30}
                    width={width}
                    onClick={() => setIsEditing(true)}
                >
                    <Text
                        x={0}
                        y={0}
                        width={width}
                        text={chapterName.toUpperCase()}
                        fontSize={16}
                        fontStyle="bold"
                        fill="#475569" // Slate 600
                        align="center"
                    />
                    {/* Pen Icon - Conditioned on Hover or always visible? Slices show always. */}
                    <Path
                        data="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        fill={isHovered ? "#a855f7" : "#475569"} // Purple on hover, Slate 600 otherwise
                        scale={{ x: 0.7, y: 0.7 }}
                        x={(width / 2) + (textWidthEstimate / 2) + 20}
                        y={-4}
                    />
                </Group>
            ) : (
                <Html divProps={{ style: { pointerEvents: 'auto' } }}>
                    <div className="absolute" style={{
                        left: `${minX + (width / 2) - 100}px`,
                        top: `${minY - 35}px`
                    }}>
                        <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') setIsEditing(false);
                            }}
                            className="bg-white border-2 border-slate-500 rounded px-2 py-1 text-sm font-bold uppercase text-slate-700 outline-none shadow-lg text-center"
                            style={{ width: '200px' }}
                        />
                    </div>
                </Html>
            )}
        </Group>
    );
};

export default ChapterGroup;
