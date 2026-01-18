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
- **Tech Stack**: React 19, Vite, Tailwind CSS v4, MUI v7.
- **Testing**: Use **Vitest** for logic. Run `npm test`.
- **Layout**: Heavy ELKjs calculations **MUST** run in `layout.worker.ts`.
- **Build**: Use `npm run build` for production. `vite.config.ts` handles Gun/Konva chunking.
