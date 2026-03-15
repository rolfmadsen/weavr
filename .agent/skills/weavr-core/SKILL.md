---
name: weavr-core
description: "MANDATORY: You MUST read this skill file via view_file before writing or styling any UI React components. The Operator's Manual for Weavr: Project structure, React 19 standards, and the Preline UI design system."
category: "Core / UI"
author: "Rolf Madsen"
tags: ["react", "typescript", "tailwind", "vite", "preline"]
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr Core Specialist

You are the master of the Weavr technical foundation. This skill covers the project structure, development environment, and UI/UX standards.

> [!IMPORTANT]
> **Always-On Guardrail**: This skill is enforced by the [weavr-core-constraints](file:///home/rolfmadsen/Github/weavr/.agent/rules/weavr-core-constraints.md) rule.

## Use this skill when
- Implementing or refactoring **React components**.
- Styling interfaces using the **Preline UI** design system.
- Managing project **structure**, dependencies, or build configurations.
- Handling **Vite**, TypeScript, or general Web API integrations.

## Do not use this skill when
- Implementing **local-first sync** logic (use `weavr-sync`).
- Defining **domain rules** or Event Modeling syntax (use `weavr-domain`).
- Architecting the **SCEP event flow** (use `weavr-architecture`).

---

## 🏗️ 1. Project Structure & Workflow
Follow the **Vertical Slice** architecture. Logic should be decomposed into feature-specific directories.
- `src/features/canvas/`: Konva rendering & viewport logic.
- `src/features/collaboration/`: GunDB services & sync hooks.
- `src/features/modeling/`: Core domain types, events, and layout.
- `src/features/workspace/`: Top-level layout (Header, Toolbar).

**Workflow**:
1. **Develop**: `npm run dev` (Vite).
2. **Build**: `npm run build` (Ensures Type safety and optimized chunks).

---

## 🎨 2. UI & Aesthetic Standards (Preline UI)
Weavr uses the official **Preline UI** design system to ensure a unified, accessible, and highly rigorous interface.

### THE MUI BAN
> [!IMPORTANT]
> **Strictly NO MUI (`@mui/*`)**. Existing MUI components are being phased out. Always implement new UI using Tailwind v4 base classes.

### The Preline Playbook
- **Standardization**: Use official [Preline UI](https://preline.co/) HTML DOM structures and standard Tailwind utility classes for all UI elements.
- **Solid Foundations**: Rely on solid colors (`bg-white`, `bg-gray-50`), structured borders (`border-gray-200`), and distinct shadows instead of translucent effects.
- **Shared Components**: Always check `src/shared/components/` to verify if a standard Preline component (like Button, Input, or Card) has already been wrapped.

---

## ⚛️ 3. React 19 Mastery
- **State Management**: 
    - Use **Zustand** as the primary **Read-Model (Projection)** for the UI. It provides synchronous access to the graph state.
    - **NEVER** use Zustand as the primary persistence layer or logic engine. All writes must go through the `eventBus` to GunDB. **GunDB is the only Source of Truth.**
- **Performance**: 
    - Use `useMemo` and `useCallback` for expensive canvas computations.
    - Leverage React 19 **Actions** for asynchronous UI transitions.
- **Dumb UI**: Design components to be "Screen" layers—they capture intent and dispatch commands via the `eventBus`.

---

## 🪄 4. Vibe Coding for UI
- **Intent-First**: Before sketching a UI, describe the "vibe" and user journey.
- **Surgical Edits**: Target specific Tailwind classes or component props rather than rewriting files.
- **Aesthetics First**: Ensure the interface feels premium and alive with micro-animations.
