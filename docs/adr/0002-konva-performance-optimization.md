# ADR 0002: Konva Performance Optimization

**Status**: Accepted
**Date**: 2025-12-31

## Context
As the Weavr system models grow in complexity (hundreds of nodes and links), the initial single-layer Konva rendering approach hit performance bottlenecks. Specifically:
- Dragging a single node forced a full redraw of all static nodes and links.
- Drawing complex shapes and multiple text elements per node was expensive during rapid panning and zooming.
- Spatial index (RBush) searches were occurring too frequently during interaction.

## Decision
We will implement three core performance strategies in the Konva-based canvas:

1.  **Category-Based Layering**: Separate nodes, links, and slices into their own `Layer` components. This allows the GPU to redraw only the links layer during a node drag, while keeping the static nodes layer untouched.
2.  **Node Caching**: Use Konva's `.cache()` feature on `NodeGroup` components to convert complex vector groups into bitmap images when they are not being actively edited/dragged.
3.  **Debounced Virtualization**: Implement a short debounce (approx. 60ms) on spatial index searches during wheel and drag events to stabilize frame rates during rapid viewport movement.

## Consequences
### Positive
- Stabilized frame rates at 60fps for models with >200 nodes.
- Significantly reduced draw calls (rendering only "images" instead of hundreds of shapes).
- Responsive UI even during complex multi-node drag operations.

### Negative
- Caching introduces a small memory overhead (bitmap storage).
- Separation of layers requires careful management of z-index and portals if nodes need to visually move between layers during a drag (solved via Portals).
- Layer count must stay below browser limits (approx. 16-32 layers). Category-based layering ensures we only use ~4 layers.
