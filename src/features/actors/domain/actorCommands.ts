import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../../modeling/store/modelingStore';
import { Actor, GunPersisted } from '../../modeling/domain/types';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

export const initActorCommands = () => {
    const getState = () => useModelingData.getState();

    // ------------------------------------------------------------------
    // ACTOR COMMANDS
    // ------------------------------------------------------------------
    bus.on('command:createActor', (cmd) => {
        const newActor: Actor = {
            id: cmd.id || uuidv4(),
            name: cmd.name,
            description: cmd.description || '',
            color: cmd.color || '#9333ea'
        };

        const modelId = getModelId();
        gunService.getModel(modelId).get('actors').get(newActor.id).put(newActor);

        bus.emit('actor:created', newActor);
    });

    bus.on('command:updateActor', (cmd) => {
        const actor = getState().actors.find(a => a.id === cmd.id);
        const previous: Partial<any> = {};
        if (actor) {
            Object.keys(cmd.changes).forEach(key => {
                previous[key] = (actor as any)[key];
            });
        }

        const modelId = getModelId();
        const sanitizedChanges: Partial<GunPersisted<Actor>> = {};
        Object.entries(cmd.changes).forEach(([key, value]) => {
            if (value === undefined) sanitizedChanges[key as keyof Actor] = null;
            else sanitizedChanges[key as keyof Actor] = value as any;
        });
        gunService.getModel(modelId).get('actors').get(cmd.id).put(sanitizedChanges);

        bus.emit('actor:updated', { id: cmd.id, changes: cmd.changes, previous });
    });

    bus.on('command:deleteActor', (cmd) => {
        const actor = getState().actors.find(a => a.id === cmd.id);
        if (actor) {
            const modelId = getModelId();
            gunService.getModel(modelId).get('actors').get(cmd.id).put(null);
            bus.emit('actor:deleted', { id: cmd.id, actor });
        }
    });
};
