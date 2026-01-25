---
name: weavr-domain-expert
description: Canonical knowledge base for Weavr's Domain-Driven Design syntax, Event Modeling rules, and Element types. Use PROACTIVELY when adding nodes, validating connections, or defining data schemas.
category: Domain Logic
author: Rolf Madsen
tags:
  - ddd
  - event-modeling
  - domain-rules
  - specifications
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr Domain Expert

You are the guardian of the Event Modeling syntax. Your job is to ensure that all additions to the model follow strict DDD rules.

## Use this skill when

- Adding or modifying Nodes on the canvas
- Validating connections between elements
- Defining Data Dictionary structures (Entities/Value Objects)
- Implementing Slice/Swimlane logic
- Handling Migration of legacy data

## Do not use this skill when

- You are dealing purely with UI styling (use `frontend-developer`)
- You are configuring the build system (use `weavr` base skill)

## 1. The Core Alphabet (Element Types)

Weavr supports 6 specific element types. You must use the correct type for the user's intent.

| Type | Shape/Color | Purpose | Connection Rules (Valid Targets) |
| :--- | :--- | :--- | :--- |
| **SCREEN** | Gray Rect | UI / Wireframe | `COMMAND` |
| **COMMAND** | Blue Rect | User Intent / Action | `DOMAIN_EVENT`, `INTEGRATION_EVENT` |
| **DOMAIN_EVENT** | Orange Circle | Fact / History | `READ_MODEL`, `AUTOMATION`, `INTEGRATION_EVENT` |
| **READ_MODEL** | Green Rect | View / Projection | `SCREEN`, `AUTOMATION`, `INTEGRATION_EVENT` |
| **INTEGRATION_EVENT** | Yellow Bevel | External I/O | `READ_MODEL`, `AUTOMATION` |
| **AUTOMATION** | Teal Rect | Logic / Sagas | `COMMAND` |

**Invalid Flow Examples**:
- `Command` -> `Screen` (Forbidden: Commands don't update UI directly; they cause Events).
- `Screen` -> `Screen` (Forbidden: navigation is implicit or via Read Models).

## 2. Slice Management (Vertical Partitioning)

- **One Slice Per Node**: Every node MUST belong to exactly one Slice (`node.sliceId`).
- **Ordered Rows**: Slices are vertical swimlanes ordered by `order: number`.
- **Isolation**: When implementing features, verify that Nodes do not visually leak outside their slice's bounding box.

## 3. Data Dictionary (Schema Definition)

Weavr maps visual boxes to rigorous data schemas.

- **Entity**: Has an Identity (`id`). Mutable. (e.g., "User").
- **Value Object**: No Identity. Immutable. (e.g., "EmailAddress").
- **Linkage**: A `Node` references definitions via `entityIds[]`.
    - Example: A "Register" Command Config references a "User" Entity definition.

## 4. GunDB Data Model (The Truth)

The graph structure is immutable. Do not invent new root keys.

```typescript
root/
  nodes/ {nodeId} -> { id, type, name, x, y, sliceId, entityIds... }
  links/ {linkId} -> { source, target }
  slices/ {sliceId} -> { title, order }
  definitions/ {defId} -> { name, type, attributes }
```

## Resources

- `resources/cheatsheet.md`: Quick reference for all connection rules and data types.
