# Feature Specification: Workspace & Utilities

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
This spec covers the "Quality of Life" features that wrap the core modeling experience: History management (Time Travel), Data persistence (Backup), and Navigation aids.

## 2. Goals
*   **Safety**: Users can undo mistakes (`useHistory`).
*   **Portability**: Users can save their work to a file and load it elsewhere (Export/Import).
*   **Efficiency**: Power users can work faster with keyboard shortcuts.
*   **Navigation**: Users can orient themselves in large diagrams (Minimap).

## 3. Technical Design: Undo/Redo
**Component**: `useHistory.ts`

### 3.1. Logic
*   **Stack**: Maintains two stacks: `past` and `future`.
*   **Actions**: Tracks `MOVE_NODE`, `ADD_NODE`, `DELETE_NODE`, `ADD_LINK`, `DELETE_LINK`.
*   **Granularity**:
    - **Node Movement**: Only captures the *end* of a drag operation (mouseup), not every pixel.
    - **Limit**: History is limited to ~50 steps to preserve memory.
*   **Sync**: Undo operations *broadcast* the inverse action to GunDB so peers see the undo.

## 4. Technical Design: Project Export/Import
**Component**: `exportUtils.ts`, `App.tsx`

### 4.1. File Format (`.json`)
The export file is a complete snapshot of the model state.
```typescript
interface WeavrProject {
    version: string;
    nodes: Node[];
    links: Link[];
    slices: Slice[];
    definitions: DataDefinition[]; // Data Dictionary
    edgeRoutes?: Record<string, number[]>; // Persisted layout paths
}
```

### 4.2. Import Logic
1.  **Validation**: Checks for basic structure (`nodes`, `links` arrays).
2.  **Legacy Support**: Detects older formats (e.g., flat arrays) and normalizes them.
3.  **Destructive**: Import *replaces* the current model. (It clears GunDB and repopulates it).

## 5. Technical Design: Shortcuts
**Component**: `useKeyboardShortcuts.ts`

| Key | Action |
| :--- | :--- |
| `Delete` / `Backspace` | Delete selected node/link. |
| `Ctrl+Z` | Undo. |
| `Ctrl+Shift+Z` | Redo. |
| `Alt+S` | Toggle Screen element tool. |
| `Alt+C` | Toggle Command element tool. |
| `Alt+E` | Toggle Domain Event element tool. |
| `Alt+R` | Toggle Read Model element tool. |
| `Alt+P` | Toggle Properties Panel. |

## 6. Verification Plan

### 6.1. Unit/Integration Tests
*   [ ] `addToHistory` pushes to stack.
*   [ ] `undo` pops from past, applies inverse, pushes to future.
*   [ ] `exportWeavrProject` generates valid JSON with all 4 root keys.

### 6.2. E2E Tests
*   [ ] Move node -> Ctrl+Z -> Node moves back.
*   [ ] Delete node -> Ctrl+Z -> Node reappears.
*   [ ] Export file -> Clear Canvas -> Import file -> Canvas restored.

## 7. Technical Design: Onboarding & Help
**Components**: `WelcomeModal.tsx`, `HelpModal.tsx`

### 7.1. Welcome Modal
*   **Trigger**: Appears on first load (no local storage flag?) or always on load? (Currently behaves as "Intro").
*   **Content**: Brief explanation of DDD elements.

### 7.2. Help Modal
*   **Trigger**: `?` Button in Toolbar.
*   **Content**: 
    *   **Introduction Tab**: Detailed Event Modeling patterns (State Change, View, Automation, Translation).
    *   **Controls Tab**: List of shortcuts and mouse interactions.

## 8. Technical Design: Navigation & Search
*   **Esc**: Closes any open Panel (Properties, Slices, Dictionary).
*   **Tab**: Cycles focus through Canvas elements (Accessibility requirement).
*   **Focus (F)**: Centers viewport on the selected node.
*   **Search Filters**: `ElementFilter` and `SliceFilter` on the canvas provide real-time filtering. 
    *   Inputs include a **Clear (X)** button for quick reset, consistent with the Properties panel search fields.

