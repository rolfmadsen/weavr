---
trigger: always_on
description: Policy for proactively using the Memory Manager to maintain context and track project decisions.
---

# Memory Protocol

This project uses a Persistent Project Memory Bank to share context and learnings across tasks and chats.

## 1. Startup Routine (Read)
Whenever you start a new task or enter a new session, you MUST read from the Memory Bank to regain context:
- Option A: Read the Parquet backup file directly using Python/Pandas (`.agent/memory-bank/conclusions_backup.parquet`).
- Option B: Use the Memory Manager `query` command to search for relevant context based on your current task.

```bash
uv run .agent/skills/memory-manager/bridge.py query --query "your_current_topic"
```

## 2. Conclusion Routine (Auto-Save)
At the end of **every** interaction, task, or session where you (the AI) have made a significant architectural decision, debugged a complex issue, or completed a major feature, you MUST pro-actively and automatically save this to the Memory Bank. Do not wait for the user to type `/sync`.

If you determine that new, valuable project context was generated, immediately execute the Memory Manager before finishing your response:

```bash
uv run .agent/skills/memory-manager/bridge.py save --text "A brief but comprehensive summary of the learning or decision." --metadata '{"type": "decision", "module": "your_module", "status": "active"}'
```

## 3. Metadata Formatting
Always format metadata as valid JSON when saving to the Memory Bank. Ensure you include useful, searchable labels:
- `type`: "decision", "learning", "bugfix", "architecture"
- `module`: The part of the system affected (e.g., "SCEP", "UI", "GunDB", "Konva")
- `status`: "active", "deprecated", "proposed"