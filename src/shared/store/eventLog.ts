import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { ModelingEvent } from '../events/types';

// Define the DB Schema
interface WeavrDB extends DBSchema {
    events: {
        key: number; // Auto-increment ID
        value: {
            timestamp: number;
            modelId: string;
            type: string;
            payload: any;
            user?: string; // For identifying who made the change
        };
        indexes: { 'by-model': string; 'by-timestamp': number };
    };
}

class EventLogService {
    private dbPromise: Promise<IDBPDatabase<WeavrDB>>;

    constructor() {
        this.dbPromise = openDB<WeavrDB>('weavr-event-log', 1, {
            upgrade(db) {
                const store = db.createObjectStore('events', { keyPath: 'key', autoIncrement: true });
                store.createIndex('by-model', 'modelId');
                store.createIndex('by-timestamp', 'timestamp');
            },
        });
    }

    /**
     * Appends an event to the local log.
     */
    async append(modelId: string, event: ModelingEvent) {
        const db = await this.dbPromise;
        await db.put('events', {
            timestamp: Date.now(),
            modelId,
            type: event.type,
            payload: (event as any).payload,
            user: 'local' // Todo: Get actual user ID
        });
    }

    /**
     * Retrieves the history for a model, sorted by timestamp.
     */
    async getEvents(modelId: string): Promise<any[]> {
        const db = await this.dbPromise;
        return db.getAllFromIndex('events', 'by-model', modelId);
    }

    /**
     * Clear history (e.g. for hard reset)
     */
    async clear(modelId: string) {
        const db = await this.dbPromise;
        // This is a bit manual in IDB, usually easier to delete range. 
        // For now, simpler implementation:
        const tx = db.transaction('events', 'readwrite');
        const index = tx.store.index('by-model');
        for await (const cursor of index.iterate(modelId)) {
            await cursor.delete();
        }
        await tx.done;
    }
}

export const eventLog = new EventLogService();
