# Feature Specification: Interoperability & Standards

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
Weavr supports two export formats to ensure users are not locked in and can interoperate with other tooling in the Event Modeling ecosystem (e.g. Ocelot).

## 2. Formats

### 2.1. Weavr Specification (`WEAVR`)
The native backup format. Includes all metadata required to perfectly restore the session.
*   **Root Keys**:
    *   `meta`: Project versions/dates.
    *   `eventModel`: The semantic graph.
    *   `dataDictionary`: The Definitions schemas.
    *   `layout`: `x, y, height` coordinates (and redundant `type`/`title` for readability) for every node.

### 2.2. Event Modeling Standard Specification (`STANDARD`)
A simplified, interoperable JSON format focusing on the semantic model only.
*   **Philosophy**: "Layout is secondary; Content is primary."
*   **Root Keys**:
    *   `slices`: Array of slices.
    *   `commands`, `events`, `screens`, `readmodels`: Embedded within slices.
    *   `dependencies`: Links defined as dependencies on elements.
*   **Limitations**: Does not enforce specific `x,y` layout (importers usually auto-layout) and may lose Weavr-specific data (Color overrides).

## 3. Technical Design: Export
**Component**: `exportUtils.ts` -> `exportWeavrProject`

### Logic
1.  **Format Selection**: User chooses "Weavr Project (JSON)" or "Standard Event Model (JSON)".
2.  **Mapping**: 
    *   Weavr Elements (`ElementType`) map to Standard Strings (`COMMAND`, `EVENT`, `SCREEN`, `READMODEL`, `AUTOMATION`).
    *   `IntegrationEvent` maps to `EVENT` with `context: "EXTERNAL"`.

## 4. Technical Design: Import
**Component**: `exportUtils.ts` -> `importWeavrProject`

### Logic
1.  **Detection**:
    *   If JSON has `eventModel` -> Treat as Weavr.
    *   If JSON has root `slices` array -> Treat as Standard.
2.  **Rehydration**:
    *   Standard files trigger an **Auto-Layout** pass after import because they lack coordinate data (`x,y` defaults to 0).
