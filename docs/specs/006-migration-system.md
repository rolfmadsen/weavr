# Feature Specification: Data Migration

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
As the application evolves (e.g., DDD Refactor), older data stored in GunDB or JSON files must be upgraded to the new schema to prevent crashes or visual bugs. The Migration system handles this transparently on load.

## 2. Goals
*   **Compatibility**: Older models (Legacy Event Types) load correctly.
*   **Consistency**: Data types (strings vs enums) are normalized.
*   **Resilience**: Missing optional fields are backfilled with defaults.

## 3. Technical Design
**Component**: `useDataMigration.ts`

### 3.1. Triggers
Migration runs in `App.tsx` inside the `useEffect` that monitors `nodes` changes or initial load.

### 3.2. Migration Rules
1.  **Legacy Event Types**:
    *   `EVENT_INTERNAL` -> `DOMAIN_EVENT`.
    *   `EVENT_EXTERNAL` -> `INTEGRATION_EVENT`.
2.  **Attribute Type Normalization**:
    *   `string` -> `String` (PascalCase).
    *   `int` -> `Int`.
    *   `bool` -> `Boolean`.
3.  **Missing Fields**:
    *   Ensure `sliceId` exists (or is explicitly undefined/null).

### 4. Verification Plan

### 4.1. Unit Tests
*   [ ] Feed a node with `type: 'EVENT_INTERNAL'` -> Output should have `type: 'DOMAIN_EVENT'`.
*   [ ] Feed a definition with `type: 'string'` -> Output should have `type: 'String'`.

### 4.2. E2E Tests
*   [ ] Import a known Legacy JSON file (v1.0) -> Verify Canvas renders orange circles (Domain Events), not broken nodes.
