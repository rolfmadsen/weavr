---
name: weavr-core-constraints
description: Enforces the MUI ban, Tailwind v4 styling mandate, and Glassmorphism design tokens.
---

# Weavr Core & UI Constraints

**CRITICAL MANDATE: These rules are NON-NEGOTIABLE and Always-On for ALL UI development.** 
You MUST NOT deviate from these standards under any circumstances. For deep context, see the [weavr-core](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-core/SKILL.md) skill.

## 🚫 The MUI Ban
- **MUI BAN (ABSOLUTE)**: Strictly NO MUI (`@mui/*`). You MUST use Tailwind utility classes or custom recipes from the Shared UI components. Do NOT import from `@mui`.

## 🎨 Styling Standards (Tailwind v4 / Preline)
- **Preline Standardization**: Use official [Preline UI](https://preline.co/) components, markup, and Tailwind classes for all UI elements.
- **Shared UI**: Favor standard UI primitives over generic HTML equivalents to maintain the Preline design system.
- **Micro-Animations**: Use standard Tailwind transitions for hover and active states.

## 🏗️ Structure & State
- **Vertical Slices**: All new UI components MUST be placed within their respective feature's `ui/` directory.
- **State Boundaries**: Use **Zustand** ONLY for high-performance Read Projections. **STRICTLY NO** direct UI-to-Zustand writes for domain data. All domain mutations MUST be emitted via `eventBus` commands.
