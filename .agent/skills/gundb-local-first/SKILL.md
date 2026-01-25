---
name: gundb-local-first
description: Implement peer-to-peer data sync with GunDB, focusing on local-first storage (IndexedDB), graph data structures, and real-time updates. Use when architecting state management for offline-capable apps.
category: Local-First / P2P
author: Rolf Madsen
tags:
  - gundb
  - local-first
  - p2p
  - offline
  - indexeddb
metadata:
  model: Gemini 3 Pro (High)
---

# GunDB Local-First Development

Guide for implementing decentralized, local-first state management using GunDB in the Weavr project.

## Use this skill when

- Implementing real-time synchronization between peers
- storing data locally with IndexedDB persistence
- working with graph data structures (nodes/edges)
- building offline-first features

## Do not use this skill when

- You need a traditional centralized SQL/NoSQL database
- You are handling strictly ephemeral UI state (use React State/Context instead)
- You need server-side aggregation or complex relational queries

## Core Implementation Pattern

### 1. Visualization & Configuration

Weavr uses a specific configuration to ensure Vite compatibility and persistence.

**Key Requirements:**
- Import side-effects for `radix`, `radisk`, `store`, and `rindexed`.
- Set `localStorage: false` to force IndexedDB usage.
- Apply the "Radix Monkey Patch" to prevent corruption from primitive values.
  - **CRITICAL**: The patch must handle *recursive* calls within `radix.js`. A shallow wrapper is insufficient because `radix.js` calls itself internally. You must fully override `window.Radix.map`.

```typescript
import Gun from 'gun/gun';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

const gun = Gun({
  peers: ['http://localhost:8080/gun'], // Or window.location.origin
  localStorage: false, // Force IndexedDB
});
```

### 2. Data Access Pattern

Group data by "Model" or "Workspace" to avoid root graph pollution.

```typescript
const gunService = {
  getModel(modelId: string) {
    return gun.get(`event-model-weaver/${modelId}`);
  },
  
  // Example: Update Node
  updateNode(modelId: string, nodeId: string, data: Partial<Node>) {
    this.getModel(modelId).get('nodes').get(nodeId).put(data);
  }
};
```

### 3. Performance Guidelines

- **No Root Subscriptions**: Never subscribe `.on()` to the root graph or large lists.
- **Specific Listeners**: Only subscribe to the specific data needed for the current viewport or view.
- **Debounce Updates**: When updating high-frequency data (like drags), debounce writes to GunDB (e.g., 500ms) to prevent network flooding, while updating local UI state immediately.

### 4. React Integration

Use `useEffect` to bridge GunDB updates to React state.

```tsx
useEffect(() => {
  const nodeRef = gunService.getModel(modelId).get('nodes').get(nodeId);
  
  // Subscription
  nodeRef.on((data) => {
    if (data) setNode(data);
  });

  // Cleanup
  return () => nodeRef.off();
}, [modelId, nodeId]);
```

## Troubleshooting

- **"Radix primitive error"**: `TypeError: Cannot create property '' on number`. This occurs when a primitive (number/boolean) is written to a graph node where an object branch is expected. 
    - **Fix**: Ensure `gunClient.ts` contains the *full recursive override* of `Radix.map`, not just a wrapper.
- **"Data not saving"**: Check if `localStorage: false` is set and IndexedDB quota is not exceeded.
- **"Updates loop"**: Avoid setting Gun data inside the `.on()` callback of the same node without a dirty check.

## Resources

- `resources/implementation-playbook.md`: Detailed implementation patterns for hooks, sync logic, and patches.
