---
name: weavr-development-guide
description: Guides the development of the Weavr local-first event modeling tool. Use when implementing React components, managing GunDB state, optimizing Konva canvas rendering, or structuring DDD features.
category: Local-First / P2P Modeling
author: Rolf Madsen
tags:
  - react
  - typescript
  - gundb
  - konva
  - local-first
  - p2p
  - ddd
lastUpdated: "2026-01-14"
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr Development Guide

This skill provides the architectural constraints, coding standards, and workflows for working on Weavr.

## When to use this skill

- Use this when **architecting new features** to ensure they align with the local-first philosophy.
- Use this when **implementing canvas interactions** to strictly follow performance guidelines (Konva + RBush).
- Use this when **modifying state logic** to ensure correct usage of GunDB (P2P sync).
- Use this when **reviewing code** to verify adherence to project structure and DDD syntax.

## How to use it

### 1. Follow Local-First State Principles
Weavr uses **GunDB** instead of a central Redux store. State is distributed and peer-to-peer.
- **Do not** create global synchronous stores for model data.
- **Do** use `gunService` to interact with the graph.
- **Pattern**:
  ```tsx
  // Example: Updating a node position directly in the graph
  import gunService from '@/features/collaboration/services/gunClient';

  const updateNodePosition = (modelId: string, nodeId: string, x: number, y: number) => {
    gunService.getModel(modelId).get('nodes').get(nodeId).put({ x, y });
  };
  ```

### 2. Optimize Canvas Performance
The canvas is the core of the application. Performance is critical.
- **Strict Layering**: Isolate updates. Keep Background, Slices, Links, and Nodes in separate `react-konva` Layers.
- **Spatial Indexing**: **ALWAYS** use the `rbush` spatial index for interaction logic (selection, hovering). Do not iterate over all nodes.
- **Culling**: Implement viewport culling to only render what is visible.

### 3. Adhere to Domain-Driven Design (DDD) Syntax
Weavr enforces strict Event Modeling rules.
- **Valid Links**: Verify `ElementType` pairs before creating edges (e.g., Command → DomainEvent).
- **Core Types**:
  ```typescript
  export enum ElementType {
    Screen = 'SCREEN',
    Command = 'COMMAND',
    DomainEvent = 'DOMAIN_EVENT',
    ReadModel = 'READ_MODEL',
    IntegrationEvent = 'INTEGRATION_EVENT',
    Automation = 'AUTOMATION',
  }
  ```

### 4. Respect Project Structure
Place code in definition-based directories within `src/features/`:
- `canvas/`: Konva rendering & RBush logic.
- `collaboration/`: GunDB services & sync hooks.
- `modeling/`: Core domain types & constraints.
- `migration/`: Versioned data migrations.

### 5. Development & Testing Workflow
- **Tech Stack**: React 19, Vite, **Tailwind CSS v4** (Glassmorphism). **NO MUI**.
- **Testing**: Use **Vitest** for logic. Run `npm test`.
- **Layout**: Heavy ELKjs calculations **MUST** run in `layout.worker.ts`.
- **Build**: Use `npm run build` for production. `vite.config.ts` handles Gun/Konva chunking.

### 6. Interaction with Installed Skills

When using other agent skills in this workspace, apply the following **Supreme Constraints**:

*   **`frontend-developer`**:
    *   **State**: Ignore recommendations for Redux/Zustand/Jotai for **Domain Data** (Nodes, Links, Slices). Use **GunDB** via `gunService`.
    *   State libraries are ONLY permitted for transient UI state (e.g., modals, drag-and-drop handles).

*   **`tailwind-design-system`**:
    *   **UI Authority**: Use this skill for **ALL** UI components.
    *   **Aesthetic**: Strictly follow the **Glassmorphism** guidelines in `resources/glassmorphism-playbook.md`.
    *   **MUI Ban**: Do NOT import `@mui/*`. Replace existing MUI components with Tailwind recipes.

*   **`architect-review`**:
    *   **Architecture**: Weavr is **Local-First / P2P**. Ignore patterns related to Microservices, API Gateways, or Server-Side Scaling.
    *   **Use For**: Defining Domain Boundaries (Vertical Slices), Separation of Concerns, and Code Structure.

*   **`event-sourcing-architect`**:
    *   **Storage**: Do NOT introduce a specialized EventStoreDB. Use **GunDB** as the immutable ledger where applicable.
    *   **Patterns**: Apply Event Sourcing concepts (Events as Facts, Projections) logically, adapting them to the graph storage model.

*   **`weavr-domain-expert`**:
    *   **Usage**: Consult this skill for **ALL** questions regarding Element Types, Valid Connection Rules, and Data Dictionary schemas.
    *   **Authority**: It supercedes any legacy documentation found in `docs/`.
