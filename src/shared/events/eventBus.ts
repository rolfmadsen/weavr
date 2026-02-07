import mitt from 'mitt';
import { EventBusMap } from './types';

// Create a singleton Event Bus
// This is the Central Nervous System of Weavr
export const bus = mitt<EventBusMap>();

// Type-safe helper to log events (for debugging)
export const debugEvents = (enabled: boolean = false) => {
    if (!enabled) return;

    // Mitt doesn't natively support a global '*' listener without a wrapper or patching
    // But we can patch emit for debugging purposes
    const originalEmit = bus.emit;
    // Correct signature matching Mitt's emit
    bus.emit = ((<Key extends keyof EventBusMap>(type: Key, payload: EventBusMap[Key]) => {
        console.groupCollapsed(`%c[Bus] ${String(type)}`, 'color: #10b981; font-weight: bold;');
        console.log('Payload:', payload);
        console.groupEnd();
        originalEmit(type, payload);
    }) as any); // Justification: Cast required because TypeScript cannot reconcile the generic lambda with Mitt's overloaded 'emit' definition.
};
