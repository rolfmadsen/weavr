# 0001. Use GunDB for Local-First P2P Synchronization

Date: 2025-12-07

## Status

Accepted

## Context

Weavr is a collaborative Event Modeling tool. Users expect:
1.  **Real-time collaboration**: Seeing changes from peers instantly.
2.  **Local-First / Offline capability**: The app should work without a reliable internet connection.
3.  **Privacy**: Data should ideally be peer-to-peer (P2P) rather than stored centrally on a SaaS server.

## Decision

We will use **GunDB** (gun.eco) as the primary data persistence and synchronization engine.
*   The application runs as a **Local-First** web app (PWA logic).
*   Data is stored in **IndexedDB** (via `radix` / `rindexed` adapters) in the browser.
*   Sync happens via WebRTC (if available) and a relay peer (websocket).

## Consequences

*   **Architecture**: No traditional REST API backend. The "Backend" is just a Gun relay peer.
*   **Challenges**: GunDB documentation is sparse. Type safety requires manual wrappers (as seen in `gunClient.ts`).
*   **Validation**: Validation must happen on the client-side (nodes/edges), as there is no central authority to reject writes.
