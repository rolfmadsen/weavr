---
name: weavr-architecture-constraints
description: Enforces the SCEP loop, Screen logic ban, and Vertical Slice isolation.
---

# Weavr Architecture Constraints

These rules ensure the structural integrity of the Local-First system. For deep details, see the [weavr-architecture](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-architecture/SKILL.md) skill.

## 📺 Screen Layer (UI Components)
- **LOGIC BAN**: Business logic, state calculations, and persistence calls are **FORBIDDEN** in React/Konva components.
- **INTENT CAPTURE**: Components must only capture user intent and dispatch commands via the `eventBus`.

## 🛡️ Vertical Slice Isolation
- **No Cross-Feature Imports**: A feature's `ui` or `domain` must NEVER import directly from another feature's internal `ui` or `domain`.
- **Communication**: Use the `eventBus` for all cross-feature coordination.
- **Domain Handlers**: Command handlers must live in `src/features/*/domain/`.

## 🔄 The SCEP Loop
- **Command -> Event -> Fact -> Projection**: Every state change must follow this unidirectional flow.
- **Store Safety**: Only Projectors are authorized to update the `modelingStore` based on emitted Facts.
