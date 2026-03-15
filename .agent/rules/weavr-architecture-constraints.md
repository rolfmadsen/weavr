---
name: weavr-architecture-constraints
description: Enforces the SCEP loop, Screen logic ban, and Vertical Slice isolation.
---

# Weavr Architecture Constraints (ABSOLUTE MANDATES)

**CRITICAL: These rules prevent structural failure. You MUST obey them.** For deep details, see the [weavr-architecture](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-architecture/SKILL.md) skill.

## 📺 Screen Layer (UI Components)
- **LOGIC BAN (STRICT)**: Business logic, state calculations, and persistence calls are **FORBIDDEN** in React/Konva components. Violation will result in a rejected PR.
- **INTENT CAPTURE**: Components MUST ONLY capture user intent and dispatch commands via the `eventBus`.

## 🛡️ Vertical Slice Isolation
- **NO CROSS-FEATURE IMPORTS**: A feature's `ui` or `domain` MUST NEVER import directly from another feature's internal `ui` or `domain`. This is a hard boundary.
- **COMMUNICATION**: You MUST use the `eventBus` for all cross-feature coordination.
- **DOMAIN HANDLERS**: Command handlers MUST live in `src/features/*/domain/`.

## 🔄 The SCEP Loop
- **Command -> Event -> Fact -> Projection**: Every state change must follow this unidirectional flow.
- **Store Safety**: Only Projectors are authorized to update the `modelingStore` based on emitted Facts.
