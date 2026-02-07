---
name: weavr-sync-constraints
description: Enforces GunDB persistence rules, null-safety in projections, and Radix patch awareness.
---

# Weavr Sync & P2P Constraints

These rules prevent synchronization loops and data corruption. For deep details, see the [weavr-sync](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-sync/SKILL.md) skill.

## 📡 GunDB Persistence
- **Pathing**: All domain data must be stored under `event-model-weaver/{modelId}/{feature}`.
- **Type Safety**: Use `GunPersisted<T>` for all data written to or read from GunDB.
- **Null Safety**: Always assume GunDB data is partial/null. Use optional chaining and provide defaults.

## 🌊 Subscriptions
- **Cleanup**: Every `.on()` listener in a component MUST have a corresponding `.off()` in the cleanup function.
- **No Side-Effects**: Do not trigger GunDB writes directly inside an `.on()` callback without a structural dirty check.

## 🔧 Radix Patch
- **Awareness**: Be aware of the Radix primitive bug. Never write a generic primitive (string/number) to a location where a graph branch is expected.
