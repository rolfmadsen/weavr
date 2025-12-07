# 0000. Use Markdown Architectural Decision Records

Date: 2025-12-07

## Status

Accepted

## Context

We need to record architectural decisions for the Weavr project to facilitate collaboration between multiple AI agents and human developers.
The documentation method must be:
1.  Version-controllable (Git-friendly).
2.  Easily parsable by LLMs/Agents.
3.  Low overhead to maintain.

## Decision

We will use **Markdown Architectural Decision Records (MADR)**.

*   ADRs will be stored in `docs/adr/`.
*   Files will be named `NNNN-title-of-decision.md`.
*   We will follow a standard structure: Context, Decision, Consequences.

## Consequences

*   **Positive**: Every major technical decision will have a "why". New agents can read this folder to understand the "mindset" of the system.
*   **Negative**: Slight overhead in writing docs before/after coding.
