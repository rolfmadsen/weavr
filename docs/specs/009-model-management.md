# Feature Specification: Model Management

**Status**: Implemented
**Last Updated**: 2025-12-07

## 1. Overview
Weavr allows users to create and manage multiple independent Event Models ("Projects"). It also supports "Cross-Model" features, allowing users to reuse Slices or Definitions from one project in another.

## 2. Goals
*   **Multi-Tenancy**: Users can work on different projects without data collision.
*   **Privacy**: Projects are stored locally (Local-First) and identified by UUIDs.
*   **Reusability**: Users can import standard definitions (e.g., "User" entity) from a shared library model.

## 3. Technical Design: Project Index
**Component**: `useModelList.ts`

### 3.1. Storage
*   **Location**: `localStorage` key `weavr_model_index`.
*   **Structure**: Array of `ModelMetadata`.
    ```typescript
    interface ModelMetadata {
        id: string; // UUID (matches GunDB graph root)
        name: string;
        createdAt: number;
        updatedAt: number;
    }
    ```

### 3.2. CRUD Operations
*   **Create**: Generates new UUID, adds to local index.
*   **List**: Displays "My Models" modal.
*   **Rename**: Updates local index + GunDB metadata.
*   **Delete**: Removes from local index (GunDB data remains as orphans currently, to prevent accidental data loss in P2P sync).

## 4. Technical Design: Cross-Model Data
**Component**: `useCrossModelData.ts`

### 4.1. Concept
Since all models live in the same GunDB namespace (peer-to-peer), the app can query *other* known models (from the local index) to suggest reusable content.

### 4.2. Capabilities
*   **Import Slice**: When typing a slice name, if it matches a slice in another project, the UI suggests importing it.
    *   *Mechanism*: Copies the slice Title and Type. (Does NOT link live; it's a copy).
*   **Import Definition**: When typing an attribute type, suggests Definitions from other projects.

## 5. Technical Design: Sharing
**Component**: `Header.tsx`
*   **Mechanism**: URL Hash Routing (`/#model_id`).
*   **Logic**: Sharing the URL allows any peer with access to the GunDB relay (or local network) to join the session.
*   **Security**: Obscurity (UUID). No auth layers currently implemented (Public P2P).

## 6. Verification Plan
*   [ ] Create Model A, Create Model B.
*   [ ] Switch between them -> Canvas clears and reloads correct data.
*   [ ] Rename Model A -> Header updates.
*   [ ] In Model B, type name of Slice from Model A -> Suggestion appears.
