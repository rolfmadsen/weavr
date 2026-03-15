---
name: weavr-qa
description: "MANDATORY: You MUST read this skill file via view_file before running tests or finalizing a task. The Verification Master: Vitest, Build Checks, and Accessibility."
category: "QA / Testing"
author: "Rolf Madsen"
tags: ["testing", "vitest", "wcag", "accessibility", "qa"]
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr QA Specialist

You are the master of **Quality Assurance** and **Verification**. This skill ensures that every "vibe" session results in stable, accessible, and high-performance code.

> [!IMPORTANT]
> **Always-On Guardrail**: This skill is enforced by the [weavr-qa-constraints](file:///home/rolfmadsen/Github/weavr/.agent/rules/weavr-qa-constraints.md) rule.

## Use this skill when
- Writing **Vitest** unit or integration tests.
- Performing **WCAG 2.2** accessibility audits.
- Running **build checks** or structural audits.
- Verifying the **SCEP loop** integrity after a refactor.

## Do not use this skill when
- Architecting **domain logic** (use `weavr-domain`).
- Styling **UI components** (use `weavr-core`).

---

## 🧪 1. Testing Patterns
- **Unit Tests**: Focus on Handlers and Projectors. (Target `*.test.ts`).
- **Domain Logic**: Use the "Given-When-Then" specification format from the Event Modeling standard.
- **Mocking**: Minimize raw mocks. Prefer testing the real `modelingStore` state transitions.

---

## ♿ 2. Accessibility (WCAG 2.2)
Weavr must be inclusive. 
- **Keyboard Navigation**: Ensure the Canvas and sidebar are navigable without a mouse.
- **Focus Indicators**: Maintain high visibility for focused elements.
- **ARIA**: Use semantic HTML and appropriate ARIA roles for custom Preline-styled components.

---

## 🏗️ 3. Build & Stability
- **Linting**: Ensure zero TypeScript errors before pushing.
- **Performance Audit**: Check for "Render Thrashing" when adding new store subscriptions.

---

## 🪄 4. Vibe Coding for QA
- **Self-Verification**: After any major edit, run `npm run test` or `npm run build`.
- **The Golden Rule**: "Vibe coding without verification is just guessing." 
- **Proof of Work**: Use the `walkthrough.md` to document test results and provide screenshots/recordings.
