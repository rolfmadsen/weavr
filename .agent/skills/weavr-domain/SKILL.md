---
name: weavr-domain
description: "MANDATORY: You MUST read this skill file via view_file before modifying Aggregates or validation logic. The Expert Guide: Alphabet, Connections, Aggregates, and Information Completeness."
category: "Domain / Logic"
author: "Rolf Madsen"
tags: ["ddd", "event-modeling", "aggregates", "schema"]
metadata:
  model: Gemini 3 Pro (High)
---

# Weavr Domain Specialist

You are the guardian of the **Event Modeling Syntax** and **DDD Logic**. This skill ensures that the model is semantically correct and follows the information system's rules.

> [!IMPORTANT]
> **Always-On Guardrail**: This skill is enforced by the [weavr-domain-constraints](file:///home/rolfmadsen/Github/weavr/.agent/rules/weavr-domain-constraints.md) rule.

## Use this skill when
- Adding or modifying **Nodes** on the canvas.
- Validating **connections** between elements.
- Defining **Data Dictionary** structures (Aggregates, Entities).
- Applying the **Information Completeness Check**.

## Do not use this skill when
- Dealing with **UI styling** (use `weavr-core`).
- Implementing **P2P sync** (use `weavr-sync`).

---

## 🔠 1. The Modeling Alphabet
Follow the strict connection rules to ensure a valid flow:

| Type | Purpose | Valid Connects To |
| :--- | :--- | :--- |
| **SCREEN** | UI Wireframe | `COMMAND` |
| **COMMAND** | User Intent | `DOMAIN_EVENT`, `INTEGRATION_EVENT` |
| **DOMAIN_EVENT** | History / Fact | `READ_MODEL`, `AUTOMATION`, `INTEGRATION_EVENT` |
| **READ_MODEL** | View Projection | `SCREEN`, `AUTOMATION`, `INTEGRATION_EVENT` |
| **INTEGRATION_EVENT** | External I/O | `READ_MODEL`, `AUTOMATION` |

**Forbidden**: Commands must never update Screens directly. Navigation is driven by Read Models.

---

## 🏛️ 2. Aggregates & Entities
- **Aggregate**: A emerald-colored cluster of domain objects.
- **Aggregate Root**: The single entry point. Exactly ONE member must be marked `isRoot`.
- **Entity**: Has identity (`id`).
- **Value Object**: No identity. Immutable.

---

## 🔍 3. Information Completeness Check
"No data appears out of thin air."
- **Test**: Pick any field on a **Screen**.
- **Trace**: Screen -> Read Model -> Event -> Command -> Screen (Input).
- If the lineage breaks, the model is incomplete.

---

## 🪄 4. Vibe Coding for Domain
- **Domain Continuity**: When an AI suggests a new field, ask: "Where is this event stored?"
- **Alphabet First**: If a connection looks "messy," revert to the core 6 types.
