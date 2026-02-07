---
name: weavr-domain-constraints
description: Enforces the Event Modeling alphabet, Aggregates hierarchy, and Information Completeness rules.
---

# Weavr Domain & Modeling Constraints

These rules ensure the semantic correctness of the modeling environment. For deep details, see the [weavr-domain](file:///home/rolfmadsen/Github/weavr/.agent/skills/weavr-domain/SKILL.md) skill.

## 🔠 The Modeling Alphabet
- **Strict Connectivity**: Only allow valid connections (e.g., Command -> Event, Event -> Read Model).
- **Type Integrity**: Every node must have a valid `ElementType`.

## 🏛️ Aggregates & Entities
- **Hierarchy**: An Entity/Value Object must have a `parentId` pointing to an Aggregate.
- **Root Rule**: Exactly ONE member of an Aggregate must be marked as `isRoot`.

## 🔍 Information Completeness (OIC)
- **Lineage**: Every field on a Screen must be traceable back to a user input via an Event and a Command. No data "out of thin air."
