import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../../modeling/store/modelingStore';
import { Node, GunPersisted, ElementType } from '../../modeling/domain/types';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

export const initNodeCommands = () => {
    const getState = () => useModelingData.getState();

    // ------------------------------------------------------------------
    // CREATE NODE
    // ------------------------------------------------------------------
    bus.on('command:createNode', (cmd) => {
        // 1. Validation (e.g., check bounds, check user permission)
        // For now, we assume valid

        // 2. Fact Generation
        const newNode: Node = {
            id: cmd.id || uuidv4(),
            type: cmd.type,
            x: cmd.x,
            y: cmd.y,
            name: 'New ' + cmd.type, // Default name
            description: '',
            sliceId: cmd.sliceId,
            pinned: cmd.pinned ?? false,
            context: cmd.type === ElementType.IntegrationEvent ? (cmd.context || 'INTERNAL') : 'INTERNAL'
        };

        // 3. Persistence (Side Effect)
        const modelId = getModelId();
        const gunData: GunPersisted<Node> = {
            ...newNode,
            // Serialize complex fields if present (though undefined initially here)
            entityIds: null,
            fields: null
        };
        // Sanitize for Gun
        if (!gunData.sliceId) gunData.sliceId = null;

        gunService.getModel(modelId).get('nodes').get(newNode.id).put(gunData);

        // 4. Emit Fact (Internal Reactivity)
        bus.emit('node:created', newNode);
    });

    // ------------------------------------------------------------------
    // MOVE NODE
    // ------------------------------------------------------------------
    bus.on('command:moveNode', (cmd) => {
        const node = getState().nodes.find(n => n.id === cmd.id);
        const previous = node ? { x: node.x || 0, y: node.y || 0, pinned: !!node.pinned } : undefined;

        // Persistence
        const modelId = getModelId();
        const data: Partial<GunPersisted<Node>> = { x: cmd.x, y: cmd.y };
        if (cmd.pinned !== undefined && cmd.pinned !== null) {
            data.pinned = cmd.pinned;
        } else {
            data.pinned = true; // Default to pinned on move
        }
        gunService.getModel(modelId).get('nodes').get(cmd.id).put(data);

        bus.emit('node:moved', {
            id: cmd.id,
            x: cmd.x,
            y: cmd.y,
            pinned: data.pinned,
            previous
        });
    });

    bus.on('command:moveNodes', (cmd) => {
        const state = getState().nodes;
        const updates = cmd.updates;
        const previous = updates.map(u => {
            const node = state.find(n => n.id === u.id);
            return { id: u.id, x: node?.x || 0, y: node?.y || 0, pinned: !!node?.pinned };
        });

        // Persistence
        const modelId = getModelId();
        updates.forEach(u => {
            const data: Partial<GunPersisted<Node>> = { x: u.x, y: u.y };
            if (cmd.pinned !== undefined && cmd.pinned !== null) {
                data.pinned = cmd.pinned;
            }
            gunService.getModel(modelId).get('nodes').get(u.id).put(data);
        });

        bus.emit('nodes:moved', {
            updates,
            previous,
            pinned: cmd.pinned
        });
    });

    // ------------------------------------------------------------------
    // UPDATE NODE
    // ------------------------------------------------------------------
    bus.on('command:updateNode', (cmd) => {
        const node = getState().nodes.find(n => n.id === cmd.id);
        const previous: Partial<Node> = {};
        if (node) {
            Object.keys(cmd.changes).forEach(key => {
                previous[key as keyof Node] = node[key as keyof Node] as any;
            });
        }

        // Persistence
        const modelId = getModelId();
        const sanitizedChanges: Partial<GunPersisted<Node>> = {};

        // Enforce Context Restriction: Only Integration Events can be External
        if (cmd.changes.context === 'EXTERNAL' && node?.type !== ElementType.IntegrationEvent) {
            cmd.changes.context = 'INTERNAL';
        }

        Object.entries(cmd.changes).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedChanges[key as keyof Node] = null;
            } else if ((key === 'fields' || key === 'entityIds') && Array.isArray(value)) {
                // @ts-ignore - manual stringify override for GunPersisted
                sanitizedChanges[key] = JSON.stringify(value);
            } else {
                sanitizedChanges[key as keyof Node] = value as any;
            }
        });

        // Smart Pin Logic: if unpinning, clear fixed coordinates
        if (cmd.changes.pinned === false) {
            sanitizedChanges.fx = null;
            sanitizedChanges.fy = null;
        }

        gunService.getModel(modelId).get('nodes').get(cmd.id).put(sanitizedChanges);


        bus.emit('node:updated', {
            id: cmd.id,
            changes: cmd.changes,
            previous: Object.keys(previous).length > 0 ? previous : undefined
        });
    });

    // ------------------------------------------------------------------
    // DELETE NODE
    // ------------------------------------------------------------------
    bus.on('command:deleteNode', (cmd) => {
        const node = getState().nodes.find(n => n.id === cmd.id);
        if (node) {
            // Persistence
            const modelId = getModelId();
            gunService.getModel(modelId).get('nodes').get(cmd.id).put(null);

            bus.emit('node:deleted', { id: cmd.id, node });
        } else {
            console.warn(`[CommandHandler] cannot delete node ${cmd.id}, not found.`);
        }
    });

    // ------------------------------------------------------------------
    // PINNING
    // ------------------------------------------------------------------
    bus.on('command:pinNode', (cmd) => {
        const modelId = getModelId();
        gunService.getModel(modelId).get('nodes').get(cmd.id).put({ pinned: true });
        bus.emit('node:pinned', { id: cmd.id, pinned: true });
    });

    bus.on('command:unpinNode', (cmd) => {
        const modelId = getModelId();
        gunService.getModel(modelId).get('nodes').get(cmd.id).put({ pinned: false, fx: null, fy: null });
        bus.emit('node:pinned', { id: cmd.id, pinned: false });
    });

    bus.on('command:pinNodes', (cmd) => {
        const modelId = getModelId();
        const batch: Record<string, Partial<GunPersisted<Node>>> = {};
        cmd.ids.forEach(id => {
            batch[id] = { pinned: true };
        });
        gunService.getModel(modelId).get('nodes').put(batch);
        bus.emit('nodes:pinned', { ids: cmd.ids, pinned: true });
    });

    bus.on('command:unpinNodes', (cmd) => {
        const modelId = getModelId();
        const batch: Record<string, Partial<GunPersisted<Node>>> = {};
        cmd.ids.forEach(id => {
            batch[id] = { pinned: false, fx: null, fy: null };
        });
        gunService.getModel(modelId).get('nodes').put(batch);
        bus.emit('nodes:pinned', { ids: cmd.ids, pinned: false });
    });
};
