---
name: weavr-sync
description: "The Sync Engine Specialist: GunDB, Radix Patch, and P2P Resilience. Use for all data persistence and peer-to-peer synchronization logic."
category: "Persistence / P2P"
author: "Rolf Madsen"
tags: ["gundb", "local-first", "p2p", "indexeddb", "sync"]
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr Sync Specialist

You are the master of the **GunDB / P2P Synchronization** engine. This skill covers how data is persisted locally and synchronized across the graph.

> [!IMPORTANT]
> **Always-On Guardrail**: This skill is enforced by the [weavr-sync-constraints](file:///home/rolfmadsen/Github/weavr/.agent/rules/weavr-sync-constraints.md) rule.

## Use this skill when
- Implementing **GunDB subscriptions** (`.on()`).
- Managing **local-first persistence** (IndexedDB).
- Debugging **graph data corruption** or "looping" updates.
- Writing to the **Sync Engine** from Projectors.

## Do not use this skill when
- Architecting the **event loop** (use `weavr-architecture`).
- Styling **UI components** (use `weavr-core`).

---

## 📡 1. GunDB Core Pattern
- **Pathing**: Group data under `event-model-weaver/{modelId}`.
- **Persistence**: Use IndexedDB (`localStorage: false`).
- **Defensive Writing**: Always use `GunPersisted<T>` types to ensure data is correctly serialized/deserialized.

---

## 🔧 2. The Radix Monkey Patch
> [!CAUTION]
> GunDB has a legacy bug regarding primitive values. **NEVER** write a primitive where an object path is expected. The `gunClient.ts` must maintain a **fully recursive override** of `window.Radix.map`.

---

## 🌊 3. P2P Resilience
P2P data is **eventually consistent**.
- **Subscription Cleanup**: Always call `.off()` in React `useEffect` cleanups.
- **Safe Projections**: Use optional chaining (`data?.name ?? 'Untitled'`) for all subscriptions.
- **Debounced Writes**: When syncing high-frequency changes (like drags), use a debounce (e.g., 500ms) to prevent network flooding.

---

## 🔄 5. Context Switching & Eco-Cancellation
GunDB manages thousands of deeply-nested P2P subscriptions per model. Dynamically swapping the `modelId` context in React without a full unmount is extremely dangerous and leads to "ghosting" (data from the old model leaking into the new model).

To safely switch contexts, the application must **hard-reload** the browser to sever all memory references and Database connections. 
**When building Model management UX, you must adhere to these 3 strict rules:**
1. **Adding/Switching Models**: Modifying the URL hash (e.g., `window.location.hash = newId;`) is the ONLY acceptable way to switch models. App.tsx watches this hash and fires an intentional `window.location.reload()`.
2. **Deleting an Inactive Model**: Removing a background model from the list **MUST NOT** trigger a reload. Simply update the local React state. Do not touch the URL hash.
3. **Deleting the Active Model**: If the user scrubs the currently viewed model, this forcefully destroys their active context. You **MUST** trigger a safe fallback reload by pointing the hash to the next available model (e.g., `window.location.hash = fallbackId;`).

---
## 🪄 4. Vibe Coding for Sync
- **No Side-Effects**: UI components must never call GunDB directly.
- **Verification**: After a "sync" refactor, verify that changes propagate to other browser tabs.
- **Fail Gracefully**: If GunDB is unavailable, the app should remain functional with the local (Zustand) state.
