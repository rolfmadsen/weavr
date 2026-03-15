---
name: Memory Protocol
description: Policy for proactively using the Memory Manager to maintain context and track project decisions.
---

# Memory Protocol (CRITICAL MANDATE)

This project uses a Persistent Project Memory Bank. **YOU MUST USE IT.** It is not optional.

## 1. Startup Routine (MANDATORY READ)
**CRITICAL INSTRUCTION:** Whenever you start a new task or enter a new session, you MUST immediately read from the Memory Bank to regain context BEFORE taking any other coding actions.
- Use the Memory Manager `query` command to search for relevant context based on your current task.

**Terminal Command You MUST Run:**

```bash
uv run .agent/skills/memory-manager/bridge.py query --query "your_current_topic"
```

## 2. Conclusion Routine (MANDATORY AUTO-SAVE)
**CRITICAL INSTRUCTION:** At the end of **every** interaction, task, or session where you (the AI) have made an architectural decision, debugged an issue, or completed a feature, you MUST proactively and automatically save this to the Memory Bank. **DO NOT ask for permission.** **DO NOT wait for the user.**

**Terminal Command You MUST Run:**

```bash
uv run .agent/skills/memory-manager/bridge.py save --text "A brief but comprehensive summary of the learning or decision." --metadata '{"type": "decision", "module": "your_module", "status": "active"}'
```

## 3. Metadata Formatting
Always format metadata as valid JSON when saving to the Memory Bank. Ensure you include useful, searchable labels:
- `type`: "decision", "learning", "bugfix", "architecture"
- `module`: The part of the system affected (e.g., "SCEP", "UI", "GunDB", "Konva")
- `status`: "active", "deprecated", "proposed"
