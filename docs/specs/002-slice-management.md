# Feature Specification: Slice Management

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
Event Modeling organizes time horizontally (left-to-right) and features vertically (top-to-bottom). These vertical rows are called **Slices**. A slice typically represents a single command flow, user story, or automation pipeline.

## 2. Goals
*   **Organization**: Group related nodes together visually (Swimlanes).
*   **Ordering**: Allow users to reorder slices to tell a coherent story (e.g., "Registration" before "Login").
*   **Management**: Create, Rename, and Delete slices easily.

## 3. User Stories
*   **As a User**, I want to create a new "Login" slice so I can model the login flow in isolation.
*   **As a User**, I want to drag the "Login" slice above "Profile" because it happens first.
*   **As a User**, I want nodes I create to belong to the slice I am currently editing.

## 4. Technical Design

### 4.1. Data Model
**Slice**:
```typescript
{
  id: string; // UUID
  title: string;
  order: number; // For sorting vertical position
  sliceType?: 'STATE_CHANGE' | 'STATE_VIEW' | 'AUTOMATION'; // Color-coding hint
  context?: string; // Bounded Context tag
  nodeIds: Set<string>; // Derived runtime set of nodes in this slice
}
```

### 4.2. Logic
*   **Ownership**: A `Node` belongs to exactly **one** `Slice` via `node.sliceId`.
*   **Ordering**: The UI renders slices sorted by `slice.order` (ascending).
*   **Visuals**:
    *   Slices are rendered as horizontal rows or "Swimlanes".
    *   Nodes belonging to a slice are constrained within that slice's bounding box (or layout engine places them there).
    *   Auto-layout respects slice boundaries (See: ELK Partitioning).

### 4.3. Interactions
*   **Adding Slice**: Appends to the end of the list (`order = max + 1`).
*   **Filtering**: Users can select specific slices to view, hiding nodes from other slices ("Focus Mode").

### 4.4. Specifications (BDD)
**Component**: `SliceList.tsx`, `SpecificationItem`

Every slice can contain multiple **Specifications** (Test Scenarios).
*   **Structure**: Gherkin-style `Given` / `When` / `Then` steps.
*   **Examples Table**: A data table for parameterized testing.
*   **Data Model**:
    ```typescript
    interface Specification {
        id: string;
        title: string;
        given: SpecificationStep[];
        when: SpecificationStep[];
        then: SpecificationStep[];
        examples?: { headers: string[], rows: string[][] };
    }
    ```
*   **Purpose**: Allows users to define acceptance criteria directly alongside the visual model.

## 5. Verification Plan

### 5.1. Unit Tests
*   [ ] Nodes with `sliceId="A"` should be grouped in `Slice A`.
*   [ ] Adding a slice should increment the highest order index.
*   [ ] Deleting a slice should (Optionally) delete its nodes or move them to a "Default" slice.

### 5.2. E2E Tests
*   [ ] Open "Slices" panel -> Click "Add Slice" -> New lane appears on canvas.
*   [ ] Create Node inside Slice A -> `node.sliceId` is set to A.
*   [ ] Reorder slices in list -> Visual vertical order on canvas changes.
*   [ ] Add Scenario -> Type Given/When/Then -> Save -> Persists.

