---
name: weavr-qa-constraints
description: Enforces mandatory self-verification through builds and tests after every vibe session.
---

# Weavr QA & Verification Constraints (ABSOLUTE MANDATES)

**CRITICAL: Velocity MUST NEVER compromise stability. You MUST verify your work.** For deep details, see the [weavr-qa](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-qa/SKILL.md) skill.

## ✅ Mandatory Verification
- **Post-Session Build (REQUIRED)**: You MUST run `npm run build` after any major structural change or feature implementation.
- **Unit Tests**: You MUST ensure all `*.test.ts` suites pass.
- **Accessibility**: You MUST verify keyboard navigation and focus indicators for any new UI element.
- **Visual Verification**: Use the browser agent to verify UI state and P2P propagation across tabs. Capture screenshots as artifacts.

## 🪄 Prompting Strategy (Intent-First)
To maintain quality, use the context-heavy prompt pattern:
**[Action] + [SCEP Layer] + [Verification]**
*Example: "Implement Delete Link. Emit command from Screen, logic in Handler. Run build verify."*

## 📝 Proof of Work
- **Walkthrough**: You MUST update `walkthrough.md` with proof of verification (e.g., build logs, test results).
- **NO TODOs (STRICT)**: You, the AI, are PROHIBITED from leaving "TODO" or placeholder logic in production code.
