---
name: tailwind-design-system
description: Build scalable design systems with Tailwind CSS, design tokens, component libraries, and responsive patterns. Use when creating component libraries, implementing design systems, or standardizing UI patterns.
metadata:
  model: Gemini 3 Pro (High)
---

# Tailwind Design System

Build production-ready design systems with Tailwind CSS, including design tokens, component variants, responsive patterns, and accessibility.

## Use this skill when

- Creating a component library with Tailwind
- Implementing design tokens and theming
- Building responsive and accessible components
- Standardizing UI patterns across a codebase
- Migrating to or extending Tailwind CSS
- Setting up dark mode and color schemes

## Do not use this skill when

- **Creating "Glassmorphism" UI**: Modern, translucent, high-fidelity interfaces.
- **Replacing Material UI**: This skill is now the **primary** UI authority.

## Key Principles: "The Glass Aesthetic"

1.  **Translucency**: Use `backdrop-blur-md` or `xl` with `bg-white/10` or `bg-black/20`.
2.  **Borders**: Subtle 1px borders using `border-white/20` to mimic glass edges.
3.  **Vibrancy**: Use high-saturation background blobs or gradients behind the glass to emphasize depth.
4.  **Dark/Light Mode**:
    *   **Light**: Icy, white transparency (`bg-white/30`).
    *   **Dark**: Deep space transparency (`bg-gray-900/60`).

> [!IMPORTANT]
> **Migration In Progress**: We are migrating *away* from MUI. Use Tailwind for all new components.

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Resources

- `resources/implementation-playbook.md` for detailed patterns and examples.
