import React, { useMemo } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import { Node, Slice } from '../types';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

interface MinimapProps {
    nodes: Node[];
    slices: Slice[];
    showSlices: boolean;
    swimlanePositions: Map<string, { x: number; y: number }>;
    zoomTransform: { k: number; x: number; y: number };
    onNavigate: (x: number, y: number, k: number) => void;
    stageWidth: number;
    stageHeight: number;
}

const Minimap: React.FC<MinimapProps> = ({
    nodes,
    slices,
    showSlices,
    swimlanePositions,
    zoomTransform,
    onNavigate,
    stageWidth,   // <--- Use this
    stageHeight   // <--- Use this
}) => {
    const width = 240;
    const height = 160;
    const padding = 30;

    // Calculate bounds and scale
    const { scale, minX, minY, contentWidth, contentHeight } = useMemo(() => {
        if (nodes.length === 0) return { scale: 1, minX: 0, minY: 0, contentWidth: 100, contentHeight: 100 };

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        nodes.forEach(node => {
            const pos = showSlices
                ? swimlanePositions.get(node.id) || { x: node.x || 0, y: node.y || 0 }
                : { x: node.fx ?? node.x ?? 0, y: node.fy ?? node.y ?? 0 };

            minX = Math.min(minX, pos.x - NODE_WIDTH / 2);
            minY = Math.min(minY, pos.y - MIN_NODE_HEIGHT / 2);
            maxX = Math.max(maxX, pos.x + NODE_WIDTH / 2);
            maxY = Math.max(maxY, pos.y + MIN_NODE_HEIGHT / 2);
        });

        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const scale = Math.min(width / contentWidth, height / contentHeight);

        return { scale, minX, minY, contentWidth, contentHeight };
    }, [nodes, showSlices, swimlanePositions]);

    // Viewport calculation
    const viewport = useMemo(() => {
        const vx = -zoomTransform.x / zoomTransform.k;
        const vy = -zoomTransform.y / zoomTransform.k;

        // CHANGE 2: Use stage dimensions instead of window
        const vw = stageWidth / zoomTransform.k;
        const vh = stageHeight / zoomTransform.k;

        return { x: vx, y: vy, width: vw, height: vh };
    }, [zoomTransform, stageWidth, stageHeight]);

    const handleStageClick = (e: any) => {
        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        // Convert click position back to world coordinates
        // The group transform is: translate(tx, ty) scale(scale)
        // clickX = (worldX - minX) * scale + tx
        // worldX = (clickX - tx) / scale + minX

        const tx = (width - contentWidth * scale) / 2;
        const ty = (height - contentHeight * scale) / 2;

        const worldX = (pointer.x - tx) / scale + minX;
        const worldY = (pointer.y - ty) / scale + minY;

        // FIX: Use stageWidth/Height props here instead of window.inner...
        const newX = -worldX * zoomTransform.k + stageWidth / 2;
        const newY = -worldY * zoomTransform.k + stageHeight / 2;

        onNavigate(newX, newY, zoomTransform.k);
    };

    const tx = (width - contentWidth * scale) / 2;
    const ty = (height - contentHeight * scale) / 2;

    return (
        <div className="absolute bottom-20 left-8 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl overflow-hidden z-10 w-[240px] h-[160px] hidden md:block transition-all duration-300 hover:shadow-2xl hover:border-indigo-200">
            <Stage width={width} height={height} onClick={handleStageClick}>
                <Layer>
                    <Group
                        scaleX={scale}
                        scaleY={scale}
                        x={tx}
                        y={ty}
                        offsetX={minX}
                        offsetY={minY}
                    >
                        {/* Slices */}
                        {showSlices && slices.map(slice => (
                            <Rect
                                key={slice.id}
                                x={slice.x}
                                y={slice.y}
                                width={slice.width}
                                height={slice.height}
                                fill={slice.color}
                                opacity={0.3}
                            />
                        ))}

                        {/* Nodes */}
                        {nodes.map(node => {
                            const pos = showSlices
                                ? swimlanePositions.get(node.id) || { x: node.x || 0, y: node.y || 0 }
                                : { x: node.fx ?? node.x ?? 0, y: node.fy ?? node.y ?? 0 };
                            return (
                                <Rect
                                    key={node.id}
                                    x={pos.x - NODE_WIDTH / 2}
                                    y={pos.y - MIN_NODE_HEIGHT / 2}
                                    width={NODE_WIDTH}
                                    height={MIN_NODE_HEIGHT}
                                    fill="#9ca3af"
                                    cornerRadius={4}
                                />
                            );
                        })}

                        {/* Viewport Indicator */}
                        <Rect
                            x={viewport.x}
                            y={viewport.y}
                            width={viewport.width}
                            height={viewport.height}
                            stroke="#6366f1"
                            strokeWidth={2 / scale}

                            // Use 4px (visual) radius, OR half the rectangle width/height—whichever is smaller.
                            cornerRadius={Math.min(
                                4 / scale,
                                viewport.width / 2,
                                viewport.height / 2
                            )}

                            listening={false}
                        />
                    </Group>
                </Layer>
            </Stage>
        </div>
    );
};

export default Minimap;
