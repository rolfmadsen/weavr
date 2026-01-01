# Feature Specification: Layout & Collaboration

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
This spec covers the "Engine" features: how the graph arranges itself (Layout) and how multiple users stay in sync (Collaboration).

## 2. Goals
*   **Auto-Layout**: Automatically arrange nodes to minimize crossing and respect time-flow (Left-to-Right).
*   **Real-Time Sync**: Instant reflection of peer changes.
*   **Persistence**: Data survives page reloads (Local-First).

## 3. Technical Design: Collaboration (Sync)
**Engine**: GunDB (See ADR-0001).

### 3.1. Structure
*   `weavr/models/{modelId}/nodes/{nodeId}` -> `{ x, y, name, type... }`
*   `weavr/models/{modelId}/links/{linkId}` -> `{ source, target }`
*   `weavr/models/{modelId}/slices/{sliceId}` -> `{ title, order... }`
*   `weavr/models/{modelId}/edgeRoutes` -> `Map<string, number[]>` (Serialized ELK routing paths)

### 3.2. Behavior
*   **Optimistic UI**: Local React state updates immediately on user action.
*   **Debounce**: High-frequency updates (dragging nodes) are debounced before sending to network.
*   **Sanitization**: `undefined` values are converted to `null` before `put()` (Critical Fix).

## 4. Technical Design: Auto-Layout
**Engine**: ELK (Eclipse Layout Kernel) running in a Web Worker.

### 4.1. Algorithm
*   **Algorithm**: `layered` (Hierarchical).
*   **Direction**: `RIGHT` (Overall flow), `DOWN` (Inside slices).
*   **Partitioning**: Nodes are grouped by `sliceId`. Each slice is a "Subgraph".

### 4.2. Routing
*   **Orthogonal**: Edges use 90-degree bends.
*   **Inter-slice**: Edges perform a "Jump" across the gap between slices.
*   **Computed Height**: Text height is pre-calculated on Main Thread because Worker has no DOM/Canvas access.
*   **Synchronization**: ELK calculated routes are persisted to GunDB. Peers use these synced routes rather than local calculation to ensure visual consistency across all sessions.

## 5. Verification Plan

### 5.1. Sync Tests
*   [ ] Open App in Tab A and Tab B.
*   [ ] Add Node in Tab A -> Appears in Tab B.
*   [ ] Move Node in Tab A -> Moves in Tab B.
*   [ ] Add Slice in Tab A -> Appears in Tab B (Check for `undefined` payload bugs).

### 5.2. Layout Tests
*   [ ] click "Auto Layout" -> Nodes move.
*   [ ] Nodes in Slice A stay in Slice A (visual bounding box).
*   [ ] Edges do not overlap nodes text.
