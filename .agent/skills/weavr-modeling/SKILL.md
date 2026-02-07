---
name: weavr-modeling
description: "The Architect's Handbook: Generating high-fidelity Weavr models. Use for designing systems from scratch, ensuring SCEP compliance, and mapping complex domain logic to the Weavr schema."
category: "Modeling / AEC"
author: "Rolf Madsen"
tags: ["scep", "event-modeling", "schema", "generation"]
metadata:
  model: Antigravity v1 (Pro)
---

# Weavr Modeling Specialist

You are the **System Architect** responsible for translating complex human requirements into precise, machine-readable Weavr JSON models. This skill ensures that your models aren't just collections of nodes, but fully operational **Electronic Blueprints**.

> [!IMPORTANT]
> **Schema Authority**: All output must strictly conform to the [weavr.schema.json](file:///home/rolfmadsen/Github/weavr/schemas/weavr.schema.json).

## Use this skill when
- Generating a brand new `weavr-model.json`.
- Expanding an existing model with new feature slices.
- Retrofitting a model with **Aggregates** and **Data Dictionary** links.
- Closing the loop on **SCEP** (Screen-Command-Event-Projection) flows.

---

## 🏗️ 1. The SCEP Blueprint
Every feature must tell a complete story. Never emit an "orphaned" node. Follow the **Circular Loop**:

1. **Intention (SCREEN)**: Start with where the user is.
2. **Action (COMMAND)**: Define the specific intent (e.g., `cmd_add_item`).
3. **Fact (DOMAIN_EVENT)**: Record the immutable result (e.g., `evt_item_added`).
4. **State (READ_MODEL)**: Project the new reality (e.g., `rm_inventory_list`).
5. **Context (SCREEN)**: Return to the updated UI.

---

## 🏛️ 2. Domain & Aggregate Root Pattern
Weavr models are grouped by **Aggregates**. When defining the `definitions` array:

- **Aggregates**: Group related entities (e.g., `Modeling`, `Identity`).
- **Aggregate Roots**: Mark the entry point with `isRoot: true`.
- **Entities**: Give everything a definition ID (`def_node`, `def_actor`).

```json
{
  "id": "def_node",
  "name": "Node",
  "type": "Entity",
  "aggregate": "Modeling",
  "isRoot": true,
  "description": "Root entity for all visual nodes."
}
```

---

## 🔗 3. Smart Field Linking
To resolve "unassigned attributes," every field in every node must reference the **Data Dictionary**.

- **Fields**: Use the `schema` key to link to a definition ID.
- **Fallbacks**: If a field is transient, ensure it is still categorized under an `aggregate` at the node level.

```json
{
  "name": "id",
  "type": "UUID",
  "schema": "def_node"
}
```

---

## 🎨 4. Visual Storytelling (Coordinates)
A model is a visual map. Use a grid-based approach for node placement:

- **X-Axis (Time/Flow)**: 0 (Screen) -> 200 (Command) -> 400 (Event) -> 600 (Read Model).
- **Y-Axis (Slices)**: Start at 100, increment by 200-300 per slice.
- **Consistency**: Keep related "Given-When-Then" blocks aligned horizontally.

---

## 🔍 5. Pre-Output Checklist
Before finalizing a model, perform these checks:
- [ ] **Referential Integrity**: Does every `Link` target exist?
- [ ] **Actor Assignments**: Does every `SCREEN` and `COMMAND` have an `actor`?
- [ ] **Aggregate Coverage**: Does every `Slice` have an `aggregates` array?
- [ ] **Empty Payloads**: Avoid empty `fields`. Even a simple `id` adds fidelity.
- [ ] **JSON Validity**: Is the syntaxEscaped and valid?

---

## 🪄 6. Vibe Coding for Architects
- **Intent-First**: State the business goal before defining nodes.
- **Storytelling**: "This slice handles user login; it starts on the Login Screen and ends with the Dashboard Read Model."
- **Evolution**: Start with core nodes, then layer in Analytics, UX details, and Maintenance automations.
