---
name: weavr-core-constraints
description: Enforces the MUI ban, Tailwind v4 styling mandate, and Glassmorphism design tokens.
---

# Weavr Core & UI Constraints

These rules are **Always-On** for all UI development. For deep context, see the [weavr-core](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-core/SKILL.md) skill.

## 🚫 The MUI Ban
- **STRICTLY NO MUI**: Do not import from `@mui/*`. Existing MUI components must be replaced with Tailwind-based Glass components.

## 🎨 Styling Standards (Tailwind v4)
- **Glassmorphism Only**: Use `backdrop-blur-md` and `bg-white/10` (or `bg-black/20`).
- **Subtle Borders**: Always use `border-white/20` for glass edges.
- **Micro-Animations**: Use standard Tailwind transitions for hover and active states.

## 🏗️ Structure & State
- **Vertical Slices**: All new UI components must be placed within their respective feature's `ui/` directory.
- **State Boundaries**: Use **Zustand** only for high-performance Read Projections. **STRICTLY NO** direct UI-to-Zustand writes for domain data. All domain mutations must be emitted via `eventBus` commands.
- **Shared Primitives**: Favor components in `src/shared/components/` (e.g., `GlassButton`, `SmartSelect`).
