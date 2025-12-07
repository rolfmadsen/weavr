# Architecture: Technology Stack & Backbone

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
Weavr is a Local-First, Peer-to-Peer Event Modeling tool. It runs entirely in the browser (PWA) and uses a distributed graph database for state.

## 2. Core Backbone (The "Stack")

### 2.1. Runtime Environment
*   **Vite**: Build tool and dev server. Fast HMR.
*   **Typescript**: Logic and Type safety.
*   **PWA**: Service Workers (future) and Local Storage for offline capability.

### 2.2. User Interface (The "Frontend")
*   **React**: Component library.
*   **MUI (Material UI)**: Form controls (inputs, dialogs, sidebars).
    *   *Usage*: Sidebars, Modals, Buttons.
*   **Tailwind CSS**: Utility-first styling for layout and typography.
    *   *Usage*: Grid systems, spacing, typography classes.
*   **Konva (react-konva)**: High-performance 2D Canvas rendering.
    *   *Usage*: The infinite canvas, nodes, links.
    *   *Why*: Performance (handling thousands of nodes) vs DOM elements.

### 2.3. State & Persistence (The "Backend")
*   **GunDB**: Decentralized graph database.
    *   *Role*: Sync engine. Replaces Redux/Context for shared state.
*   **IndexedDB**: Browser-native database.
    *   *Role*: Persistent storage for GunDB (via `radix` / `radisk` adapters).
*   **UUID**: Unique ID generation for distributed collision avoidance.

### 2.4. Engines (The "Workers")
*   **Web Worker**: Runs heavy computations off the main thread.
*   **ELKjs (Eclipse Layout Kernel)**: Automatic graph layout algorithm.
    *   *Role*: Calculates node `x,y` positions.
    *   *Isolation*: Runs inside the Web Worker to prevent UI freezing.

### 2.5. Optimization
*   **Rbush**: R-Tree spatial indexing.
    *   *Role*: Fast collision detection and viewport culling (rendering only visible nodes).
    *   *Location*: `useSpatialIndex.ts`.

## 3. High-Level Data Flow
1.  **User Action**: Drag Node -> React Event.
2.  **State Update**: `gunClient.put()` writes to local Gun graph.
3.  **Sync**: Gun sends diffs to peers (WebRTC/Socket) and saves to IndexedDB.
4.  **Render Loop**: 
    *   `useGraphSync` hook subscribes to Gun changes.
    *   Updates local React state.
    *   `Rbush` filters visible nodes.
    *   `Konva` draws the scene.

## 4. Key Libraries Map
| Feature | Library |
| :--- | :--- |
| **Canvas** | `react-konva`, `konva` |
| **Styling** | `@mui/material`, `tailwindcss` |
| **Graph DB** | `gun` |
| **Layout** | `elkjs` |
| **Icons** | `lucide-react` (or custom SVG) |
| **Spatial** | `rbush` |
| **Utils** | `uuid` |
