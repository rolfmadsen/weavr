---
trigger: always_on
description: Enforces the Event Modeling alphabet, Aggregates hierarchy, and Information Completeness rules.
---

# Weavr Domain & Modeling Constraints (ABSOLUTE MANDATES)

**CRITICAL: Semantic correctness depends on these rules. You MUST follow them.** For deep details, see the [weavr-domain](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-domain/SKILL.md) skill.

## 🔠 The Modeling Alphabet
- **Strict Connectivity**: Only allow valid connections (e.g., Command -> Event, Event -> Read Model).
- **Type Integrity**: Every node must have a valid `ElementType`.

## 🏛️ Aggregates & Entities
- **Hierarchy**: An Entity/Value Object MUST have a `parentId` pointing to an Aggregate.
- **Root Rule (NON-NEGOTIABLE)**: Exactly ONE member of an Aggregate MUST be marked as `isRoot`.

## 🔍 Information Completeness Check
- **Lineage (STRICT)**: Every field on a Screen MUST be traceable back to a user input via an Event and a Command. Absolutely no data "out of thin air."