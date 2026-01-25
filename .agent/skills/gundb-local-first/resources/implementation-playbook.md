# GunDB Local-First Implementation Playbook

This playbook details the specific implementation patterns for GunDB within the Weavr architecture. It covers synchronization, optimistic UI updates, conflict resolution, and performance optimizations.

## 1. Setup & Configuration

### Application Entry (Radix Patch)
Weavr requires a "monkey patch" for the Radix storage engine to prevent crashes with primitive values. This must run before Gun is instantiated.

```typescript
// src/features/collaboration/store/gunClient.ts
import Gun from 'gun/gun';
import 'gun/lib/radix';
import 'gun/lib/radisk';
import 'gun/lib/store';
import 'gun/lib/rindexed';

// --- MONKEY PATCH START ---
if (typeof window !== 'undefined' && (window as any).Radix) {
  const OriginalRadixMap = (window as any).Radix.map;
  (window as any).Radix.map = function (radix: any, cb: any, opt: any, pre: any) {
    if (radix && typeof radix !== 'object' && typeof radix !== 'function') {
      console.warn('Recovered from Radix primitive corruption:', radix);
      return;
    }
    return OriginalRadixMap(radix, cb, opt, pre);
  };
}
// --- MONKEY PATCH END ---

const gun = Gun({
  peers: ['http://localhost:8080/gun'],
  localStorage: false, // FORCE IndexedDB
});
```

## 2. Synchronization Hook Pattern (`useGraphSync`)

Use a dedicated hook to manage the lifecycle of GunDB subscriptions. This isolates synchronization logic from UI components.

### Core Principles:
1.  **Ref-Based Caching**: Use `useRef` (e.g., `tempNodesRef`) to store the latest data from GunDB immediately. This prevents closures from accessing stale data in callbacks.
2.  **Optimistic Updates**: Update React state (`setNodes`) *immediately* on user action, then fire-and-forget the GunDB write.
3.  **Echo Cancellation**: Maintain a `lastLocalUpdateRef` map. If a GunDB update arrives for an ID that was locally updated < 2000ms ago, ignore it.
4.  **Debounced State Sync**: Incoming GunDB updates should update the `Ref` immediately but debounce the `setState` call (e.g., 50ms) to avoid re-rendering React 60 times per second during a bulk sync.

### Example Template

```typescript
export function useGraphSync(modelId: string) {
  const [nodes, setNodes] = useState<Node[]>([]);
  // Source of Truth for DB data
  const tempNodesRef = useRef(new Map<string, Node>());
  // Echo cancellation buffer
  const lastLocalUpdateRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!modelId) return;
    const model = gunClient.getModel(modelId);

    // Debounce timer
    let updateTimer: ReturnType<typeof setTimeout> | null = null;

    const sub = model.get('nodes').map().on((data, id) => {
      // 1. Echo Cancellation
      const lastUpdate = lastLocalUpdateRef.current.get(id);
      if (lastUpdate && Date.now() - lastUpdate < 2000) return;

      // 2. Update Ref (Cache)
      if (data) {
        tempNodesRef.current.set(id, { id, ...data });
      } else {
        tempNodesRef.current.delete(id);
      }

      // 3. Debounce React Render
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = setTimeout(() => {
        setNodes(Array.from(tempNodesRef.current.values()));
      }, 50);
    });

    return () => sub.off();
  }, [modelId]);

  return { nodes };
}
```

## 3. Optimistic Mutations

When writing to GunDB, always update the local state first.

```typescript
const updatePosition = useCallback((id: string, x: number, y: number) => {
    // 1. Lock Echo (prevent loopback)
    lastLocalUpdateRef.current.set(id, Date.now());

    // 2. Optimistic UI Update
    setNodes(prev => prev.map(n => n.id === id ? { ...n, x, y } : n));

    // 3. Fire Gun Update
    gunClient.getModel(modelId).get('nodes').get(id).put({ x, y });
}, [modelId]);
```

## 4. History Integration Pattern

Weavr separates Sync (GunDB) from History (Undo/Redo).
- **History** affects *logic*: "Undo Add Node".
- **Sync** affects *persistence*: "Node X now exists".

The History hook (`useHistory`) should receive callback props from the Sync hook (`onAddNode`, `onUpdateNode`) so that undoing an action triggers the same optimistic+gun logic as a user interaction.

```typescript
// useHistory.ts
export function useHistory({ onUpdateNode }) {
    const undo = () => {
        const action = undoStack.pop();
        if (action.type === 'MOVE') {
            // Re-use the sync hook's updating logic
            onUpdateNode(action.id, action.oldPosition); 
        }
    }
}
```

## 5. Deployment Checklist

- [ ] `localStorage: false` is configured.
- [ ] Radix Monkey Patch is active.
- [ ] No `.on()` listeners are attached to the root graph.
- [ ] All high-frequency inputs (drags) are using `lastLocalUpdateRef` or debouncing.
