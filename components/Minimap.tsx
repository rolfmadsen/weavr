import React, { useMemo } from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import Konva from 'konva';
import { Node, Slice } from '../types';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

interface MinimapProps {
    nodes: Node[];
    slices?: Slice[];
    showSlices?: boolean;
    swimlanePositions?: Map<string, { x: number; y: number }>;
    stageScale: number;
    stagePos: { x: number; y: number };
    onNavigate: (x: number, y: number) => void;
    viewportWidth: number;
    viewportHeight: number;
}

const Minimap: React.FC<MinimapProps> = ({
    nodes,
    slices = [],
    showSlices = false,
    swimlanePositions = new Map(),
    stageScale,
    stagePos,
    onNavigate,
    viewportWidth,
    viewportHeight
}) => {
    const width = 240;
    const height = 160;
    const padding = 30;

    // 1. Beregn grænser, skala og viewport i én samlet operation
    const { scale, minX, minY, contentWidth, contentHeight, viewport } = useMemo(() => {
        // Beregn Viewport i 'World Coordinates'
        const vx = -stagePos.x / stageScale;
        const vy = -stagePos.y / stageScale;
        const vw = viewportWidth / stageScale;
        const vh = viewportHeight / stageScale;

        const currentViewport = { x: vx, y: vy, width: vw, height: vh };

        // Start grænserne med viewporten (så den altid er synlig)
        let minX = vx;
        let minY = vy;
        let maxX = vx + vw;
        let maxY = vy + vh;

        // Udvid grænserne med noderne
        if (nodes.length > 0) {
            nodes.forEach(node => {
                const pos = showSlices
                    ? swimlanePositions.get(node.id) || { x: node.x || 0, y: node.y || 0 }
                    : { x: node.fx ?? node.x ?? 0, y: node.fy ?? node.y ?? 0 };

                minX = Math.min(minX, pos.x);
                minY = Math.min(minY, pos.y);
                maxX = Math.max(maxX, pos.x + NODE_WIDTH);
                maxY = Math.max(maxY, pos.y + MIN_NODE_HEIGHT);
            });
        }

        // Tilføj padding
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        // Beregn scale så det HELE (noder + viewport) kan være der
        const safeWidth = Math.max(contentWidth, 1);
        const safeHeight = Math.max(contentHeight, 1);
        const scale = Math.min(width / safeWidth, height / safeHeight);

        return { scale, minX, minY, contentWidth, contentHeight, viewport: currentViewport };
    }, [nodes, showSlices, swimlanePositions, stageScale, stagePos, viewportWidth, viewportHeight]);

    // Håndter klik på baggrunden (hop til punkt)
    const handleStageClick = (e: any) => {
        // Hvis vi trækker (drag), skal vi ikke også navigere via klik
        if (e.target.attrs.draggable) return;

        const stage = e.target.getStage();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const tx = (width - contentWidth * scale) / 2;
        const ty = (height - contentHeight * scale) / 2;

        const worldX = (pointer.x - tx) / scale + minX;
        const worldY = (pointer.y - ty) / scale + minY;

        // Centrer viewet omkring klikket
        const newX = -worldX * stageScale + viewportWidth / 2;
        const newY = -worldY * stageScale + viewportHeight / 2;

        onNavigate(newX, newY);
    };

    // 2. Håndter drag af det blå rektangel
    const handleViewportDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
        e.cancelBubble = true;

        // e.target.x() er den nye 'world x' position inden i gruppen
        const newWorldX = e.target.x();
        const newWorldY = e.target.y();

        // Omregn world coordinates tilbage til stage position
        // viewport.x = -stageX / k  =>  stageX = -viewport.x * k
        const newStageX = -newWorldX * stageScale;
        const newStageY = -newWorldY * stageScale;

        onNavigate(newStageX, newStageY);
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
                                listening={false}
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
                                    x={pos.x}
                                    y={pos.y}
                                    width={NODE_WIDTH}
                                    height={MIN_NODE_HEIGHT}
                                    fill="#9ca3af"
                                    cornerRadius={4}
                                    listening={false}
                                />
                            );
                        })}

                        {/* Viewport Indicator (Nu draggable) */}
                        <Rect
                            x={viewport.x}
                            y={viewport.y}
                            width={viewport.width}
                            height={viewport.height}
                            stroke="#6366f1"
                            strokeWidth={2 / scale}
                            fill="rgba(99, 102, 241, 0.1)" // Tilføjet svag baggrundsfarve for at gøre den lettere at ramme
                            cornerRadius={Math.min(4 / scale, viewport.width / 2, viewport.height / 2)}

                            draggable
                            onDragMove={handleViewportDragMove}

                            // Skift cursor når man holder over
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'move';
                            }}
                            onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'default';
                            }}
                        />
                    </Group>
                </Layer>
            </Stage>
        </div>
    );
};

export default Minimap;
