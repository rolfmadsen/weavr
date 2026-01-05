# Weavr Example Model Generation

This directory contains the scripts and source files used to generate the canonical `weavr-model.json` example project.

## Files

*   **`weavr-model.json`**: The final, valid JSON file used by the Weavr application.
*   **`weavr-self-model.json`**: The "source of truth" definition of the Weavr model itself (Event Modeling of the Event Modeling tool). This file is edited manually to add new features or correct logic.
*   **`fix_weavr_model.py`**: A Python script that transforms `weavr-self-model.json` into `weavr-model.json`. It fixes dependency directions (INBOUND to OUTBOUND), maps types (e.g., `DOMAIN_EVENT` -> `EVENT`), and generates the layout coordinates for correct visualization.
*   **`audit_patterns.py`**: A validation script that checks `weavr-self-model.json` for strict adherence to Event Modeling patterns (e.g., Commands must be triggered by Screens/Automations, Events must trigger Read Models/Automations).

## Workflow

1.  **Edit the Model**: Modify `weavr-self-model.json` to reflect changes in the domain logic.
2.  **Audit Patterns**: Run the audit script to ensure compliance.
    ```bash
    python3 audit_patterns.py
    ```
    Resolve any violations reported.
3.  **Generate Output**: Run the fix script to produce the final JSON.
    ```bash
    python3 fix_weavr_model.py
    ```
4.  **Verify**: Load `weavr-model.json` in the Weavr application to verify the visual result.
