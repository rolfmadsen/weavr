import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../../modeling/store/modelingStore';
import { Slice, GunPersisted } from '../../modeling/domain/types';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

export const initSliceCommands = () => {
    const getState = () => useModelingData.getState();

    // ------------------------------------------------------------------
    // SLICE COMMANDS
    // ------------------------------------------------------------------
    bus.on('command:createSlice', (cmd) => {
        const newSlice: Slice = {
            id: cmd.id || uuidv4(),
            title: cmd.title,
            order: cmd.order || 0,
            nodeIds: new Set<string>(),
            color: 'transparent'
        };

        // Persistence
        const modelId = getModelId();

        // Exclude runtime-only properties (nodeIds) and cast to strict persisted type
        // 'nodes' property does not exist on Slice and shouldn't be destructured
        const { nodeIds, ...rest } = newSlice as unknown as Slice;
        const sliceData: GunPersisted<Slice> = { ...rest } as unknown as GunPersisted<Slice>;

        if (rest.specifications && Array.isArray(rest.specifications)) {
            // @ts-ignore - manual stringify override for GunPersisted
            sliceData.specifications = JSON.stringify(rest.specifications);
        }
        gunService.getModel(modelId).get('slices').get(newSlice.id).put(sliceData);

        bus.emit('slice:created', newSlice);
    });

    bus.on('command:updateSlice', (cmd) => {
        const slice = getState().slices.find(s => s.id === cmd.id);
        const previous: Partial<Slice> = {};
        if (slice) {
            Object.keys(cmd.changes).forEach(key => {
                previous[key as keyof Slice] = slice[key as keyof Slice] as any;
            });
        }

        // Persistence
        const modelId = getModelId();
        const sanitizedChanges: Partial<GunPersisted<Slice>> = {};
        Object.entries(cmd.changes).forEach(([key, value]) => {
            if (key === 'nodeIds') return;
            if (value === undefined) {
                sanitizedChanges[key as keyof Slice] = null;
            } else if (key === 'specifications' && Array.isArray(value)) {
                // @ts-ignore - manual stringify override
                sanitizedChanges[key] = JSON.stringify(value);
            } else {
                sanitizedChanges[key as keyof Slice] = value as any;
            }
        });
        gunService.getModel(modelId).get('slices').get(cmd.id).put(sanitizedChanges);

        bus.emit('slice:updated', { id: cmd.id, changes: cmd.changes, previous });
    });

    bus.on('command:deleteSlice', (cmd) => {
        const slice = getState().slices.find(s => s.id === cmd.id);
        if (slice) {
            const modelId = getModelId();
            gunService.getModel(modelId).get('slices').get(cmd.id).put(null);
            bus.emit('slice:deleted', { id: cmd.id, slice });
        }
    });
};
