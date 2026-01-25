---
description: Standardized code review process to prevent errors, side effects, and architectural regression. Run this before marking a task as complete.
---

# Code Review Workflow

Follow this checklist to ensure stability and code quality.

## 1. Static Analysis & Build Verification

First, ensure the code compiles and types are correct.

```bash
# Check TypeScript types
npm run build
```

> If `npm run build` fails, **STOP**. Fix type errors first.

## 2. Automated Testing

Run the test suite to catch regressions.

```bash
// turbo
npm test
```

## 3. Architectural Compliance (Crucial)

Trigger the `architect-review` skill to check for side effects and boundary violations.

**Prompt for the Agent:**
"Review the recent changes in `src/features/` logic. Ensure that:
1. **Vertical Slices**: Verify that features (e.g., `src/features/canvas`) do NOT import from other features' internal implementation details. Imports should only be from `src/shared` or the public API of another feature.
2. **Weavr Constraints**: No `Redux`, `Zustand`, or Microservices patterns.
3. **GunDB Usage**: Follows `gundb-local-first` patterns (cleanups, no root listeners)."

## 4. Documentation & ADRs (`docs/`)

Did this change affect architecture or requirements?

1. **Check Specs**: verifying if `docs/specs/*.md` needs updates to reflect new behavior.
2. **Check ADRs**: If a significant architectural decision was made (e.g., "Changing how Nodes are stored"), ensure a new ADR is created in `docs/adr/`.
3. **Prompt for Agent**: "Check if the changes in this PR require updating `docs/specs` or creating a new ADR in `docs/adr`."

## 5. State & Persistence Check (`gundb-local-first`)

If `GunDB` or `useGraphSync` was modified:

1. **Verify LocalStorage**: Ensure `localStorage: false` is still set in `gunClient.ts`.
2. **Review Subscriptions**: usage of `.on()` must clean up with `.off()` or `useEffect` return.
3. **Echo Cancellation**: Ensure `lastLocalUpdateRef` is used for bi-directional sync hooks.

## 5. UI & Accessibility Check (`wcag-audit-patterns`)

If UI components were modified:

1. **Run Accessibility Audit**: "Check `[ModifiedComponent]` for WCAG 2.2 AA compliance using `wcag-audit-patterns`."
2. **Performance**: Verify no new unnecessary re-renders in Canvas components (use React DevTools if manual, or `frontend-developer` heuristics).

## 6. Final "Side-Effect" Scan

Ask yourself:
- Did I change a shared utility in `src/shared/`? If so, did I check *all* consumers?
- Did I modify a domain event schema? Is it backwards compatible with existing GunDB data?

## 7. Approval

If all checks pass, the task is ready for user sign-off.