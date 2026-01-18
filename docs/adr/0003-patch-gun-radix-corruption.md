# 3. Monkey Patch GunDB Radix Engine

Date: 2026-01-18

## Status

Accepted

## Context

Weavr uses GunDB with the `radix` + `radisk` (IndexedDB) storage adapter for local-first peer-to-peer synchronization. During development, a recurring error was observed in the browser console:

`TypeError: Cannot create property '' on number '1767635178351.003'`

This error originates deep within `gun/lib/radix.js` (line 72). It occurs when the Radix tree traversal algorithm usually used for reading data from disk (`radisk`) encounters a primitive value (specifically a number, likely a timestamp) at a location in the tree where it expects a node (a JavaScript object) to exist.

When `radix.js` attempts to cache a sort function on this expected object (`t[_] = ...`), it fails because `t` is a number.

The root cause is likely a race condition in `radisk`'s batch writing or conflict resolution (HAM) logic, which occasionally writes a timestamp (primitive) into a path that should remain a branch (object). This results in a corrupted local IndexedDB state.

## Decision

We will apply a "Monkey Patch" to the `Radix.map` function during the application's initialization phase in `src/features/collaboration/store/gunClient.ts`.

The patch will:
1.  Intercept all calls to `Radix.map`.
2.  Check if the `node` argument is a primitive (not an object and not undefined).
3.  If it is a primitive, silence the error (return early) instead of allowing the `TypeError` to be thrown.
4.  Log a warning to the console (once or periodically) to indicate that corruption was encountered and handled.

## Consequences

### Positive
*   **Stability**: The application will no longer crash or spam the console with TypeErrors when it encounters this specific form of data corruption.
*   **Resiliency**: The application can continue to load valid data from other branches of the tree.
*   **Self-Healing**: Since GunDB is an eventually consistent graph, future valid writes to the corrupted path should overwrite the bad primitive with a correct object (or vice versa), effectively healing the graph over time without requiring a hard reset of the user's data.

### Negative
*   **Technical Debt**: Monkey-patching library internals is fragile and may break if `gun/lib/radix.js` implementation changes significantly in future versions (though Gun v0.2020 has been stable for a long time).
*   **Hidden State**: We are effectively hiding a data consistency bug rather than fixing the underlying race condition in the storage adapter. However, fixing the storage adapter itself requires a deep dive into `gun` core, which is out of scope.

## Implementation

The patch is applied in `src/features/collaboration/store/gunClient.ts` immediately after importing the Gun libraries and before creating the Gun instance.
