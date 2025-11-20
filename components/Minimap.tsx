import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Node, Slice } from '../types';
import { NODE_WIDTH, MIN_NODE_HEIGHT } from '../constants';

interface MinimapProps {
    nodes: Node[];
    slices: Slice[];
    showSlices: boolean;
    swimlanePositions: Map<string, { x: number; y: number }>;
    zoomTransform: d3.ZoomTransform;
    onNavigate: (x: number, y: number, k: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({ nodes, slices, showSlices, swimlanePositions, zoomTransform, onNavigate }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

        const svg = d3.select(svgRef.current);
        const width = 240;
        const height = 160;

        // Calculate bounds of the content
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

        // Add some padding
        const padding = 100;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;
        const scale = Math.min(width / contentWidth, height / contentHeight);

        // Clear previous content
        svg.selectAll('*').remove();

        const g = svg.append('g')
            .attr('transform', `translate(${(width - contentWidth * scale) / 2 - minX * scale}, ${(height - contentHeight * scale) / 2 - minY * scale}) scale(${scale})`);

        // Draw slices if enabled
        if (showSlices) {
            g.selectAll('rect.slice')
                .data(slices)
                .enter()
                .append('rect')
                .attr('class', 'slice')
                .attr('x', d => d.x!)
                .attr('y', d => d.y!)
                .attr('width', d => d.width!)
                .attr('height', d => d.height!)
                .attr('fill', d => d.color)
                .attr('opacity', 0.3);
        }

        // Draw nodes
        g.selectAll('rect.node')
            .data(nodes)
            .enter()
            .append('rect')
            .attr('class', 'node')
            .attr('x', d => {
                const pos = showSlices
                    ? swimlanePositions.get(d.id) || { x: d.x || 0, y: d.y || 0 }
                    : { x: d.fx ?? d.x ?? 0, y: d.fy ?? d.y ?? 0 };
                return pos.x - NODE_WIDTH / 2;
            })
            .attr('y', d => {
                const pos = showSlices
                    ? swimlanePositions.get(d.id) || { x: d.x || 0, y: d.y || 0 }
                    : { x: d.fx ?? d.x ?? 0, y: d.fy ?? d.y ?? 0 };
                return pos.y - MIN_NODE_HEIGHT / 2;
            })
            .attr('width', NODE_WIDTH)
            .attr('height', MIN_NODE_HEIGHT) // Using min height for simplicity in minimap
            .attr('fill', '#9ca3af') // Lighter gray for better contrast
            .attr('rx', 4) // Rounded corners for nodes
            .attr('ry', 4);

        // Draw viewport rectangle
        // The viewport is defined by the inverse of the zoom transform applied to the window dimensions
        const viewportX = -zoomTransform.x / zoomTransform.k;
        const viewportY = -zoomTransform.y / zoomTransform.k;
        const viewportW = window.innerWidth / zoomTransform.k;
        const viewportH = window.innerHeight / zoomTransform.k;

        g.append('rect')
            .attr('class', 'viewport')
            .attr('x', viewportX)
            .attr('y', viewportY)
            .attr('width', viewportW)
            .attr('height', viewportH)
            .attr('fill', 'none')
            .attr('stroke', '#6366f1') // Indigo-500
            .attr('stroke-width', 20 / scale)
            .attr('rx', 20 / scale) // Rounded viewport
            .attr('ry', 20 / scale);

        // Click to navigate
        svg.on('click', (event) => {
            const [clickX, clickY] = d3.pointer(event, g.node());
            // Center the view on the click
            const newX = -clickX * zoomTransform.k + window.innerWidth / 2;
            const newY = -clickY * zoomTransform.k + window.innerHeight / 2;
            onNavigate(newX, newY, zoomTransform.k);
        });

    }, [nodes, slices, showSlices, swimlanePositions, zoomTransform, onNavigate]);

    return (
        <div ref={containerRef} className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm border-2 border-gray-200 shadow-xl rounded-xl overflow-hidden z-10 w-[240px] h-[160px] hidden md:block transition-all duration-300 hover:shadow-2xl hover:border-indigo-200">
            <svg ref={svgRef} width="100%" height="100%" className="cursor-crosshair"></svg>
        </div>
    );
};

export default Minimap;
