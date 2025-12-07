# Feature Specification: Core Event Modeling

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
The core function of Weavr is to allow users to create "Event Models" by placing nodes on an infinite canvas and connecting them. The model follows strict Domain-Driven Design (DDD) and Event Modeling rules to ensure semantic correctness.

## 2. Goals
*   **Semantic Consistency**: Users should only be able to create valid Event Sourcing patterns.
*   **Visual Clarity**: Different element types must be visually distinct (Shape & Color).
*   **Fluidity**: Adding and connecting nodes should be fast and intuitive.

## 3. User Stories
*   **As a User**, I want to add specific elements (Screen, Command, Event) so that I can describe my system.
*   **As a User**, I want to draw arrows between elements to show data flow.
*   **As a System**, I want to prevent invalid connections (e.g., Screen -> Screen) to enforce the Event Modeling grammar.

## 4. Technical Design

### 4.1. Element Types (The "Alphabet")
The system supports the following `ElementType`s:

| Type | Shape | Color | Purpose |
| :--- | :--- | :--- | :--- |
| **Screen** | Rect | Gray (`#e5e7eb`) | User Interface / Wireframe |
| **Command** | Rect | Blue (`#3b82f6`) | User Intent / State Change Request |
| **Domain Event** | Circle | Orange (`#f97316`) | Fact of what happened |
| **Read Model** | Rect | Green (`#22c55e`) | View Model / Projection |
| **Integration Event** | Beveled | Yellow (`#facc15`) | External System I/O |
| **Automation** | Rect | Teal (`#14b8a6`) | Policy / Cron / Logic |

### 4.2. Connection Rules (The "Grammar")
Connections are directed. The system validates `isValidConnection(source, target)`.

**Standard Flows:**
1.  `Screen` -> `Command`: User clicks button.
2.  `Command` -> `Domain Event`: Command succeeds.
3.  `Domain Event` -> `Read Model`: Event updates view.
4.  `Read Model` -> `Screen`: properties displayed to user.

**Automation Flows:**
1.  `Domain Event` -> `Automation`: Event triggers logic.
2.  `Read Model` -> `Automation`: Logic reads data.
3.  `Automation` -> `Command`: Logic issues command (Side effect).

**Integration Flows:**
1.  `Integration Event` -> `Read Model`: External data updates internal view.
2.  `Integration Event` -> `Automation`: External hook triggers logic.
3.  `Read Model` -> `Integration Event`: Export data to external.
4.  `Command` -> `Integration Event`: Command triggers external hook.

### 4.3. Data Structure
**Node**:
```typescript
{
  id: string; // UUID
  type: ElementType;
  name: string;
  x: number;
  y: number;
  sliceId?: string; // Optional ownership
  entityIds?: string[]; // IDs of Data Definitions (Entities/Events) bound to this node
}
```


**Link**:
```typescript
{
  id: string; // UUID
  source: string; // NodeId
  target: string; // NodeId
}
```

## 5. Verification Plan (Test Precursors)

### 5.1. Validation Tests (Unit)
*   [ ] `Screen` -> `Command` should be **VALID**.
*   [ ] `Command` -> `Screen` should be **INVALID**.
*   [ ] `Command` -> `Domain Event` should be **VALID**.
*   [ ] `Domain Event` -> `Command` should be **INVALID** (Must go via Automation).
*   [ ] `Screen` -> `Screen` should be **INVALID**.

### 5.2. UI Tests (E2E)
*   [ ] Double-clicking the canvas adds a Default Node (Screen?).
*   [ ] Dragging a handle from Node A to Node B creates a link if valid.
*   [ ] Dragging a handle from Node A to Node B does *nothing* or shows error if invalid.
