import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../../modeling/store/modelingStore';
import { DataDefinition, GunPersisted } from '../../modeling/domain/types';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

export const initDictionaryCommands = () => {
    const getState = () => useModelingData.getState();

    // ------------------------------------------------------------------
    // DEFINITION COMMANDS
    // ------------------------------------------------------------------
    bus.on('command:createDefinition', (cmd) => {
        const id = cmd.id || uuidv4();
        const name = cmd.name || 'Untitled';
        const type = (cmd.type as any) || 'Value Object';
        const description = cmd.description || '';
        const parentId = cmd.parentId || null;
        const isRoot = !!cmd.isRoot;
        const attributes = cmd.attributes || [];

        const newDef: DataDefinition = {
            id,
            name,
            type,
            description,
            parentId,
            isRoot,
            attributes
        };

        const modelId = getModelId();
        const gunData: any = {
            id,
            name,
            type,
            description,
            parentId,
            isRoot,
            attributes: JSON.stringify(attributes)
        };

        console.log(`[DictionaryCommands] Persisting new definition to Gun (${modelId}):`, gunData);
        gunService.getModel(modelId).get('definitions').get(id).put(gunData);

        bus.emit('definition:created', newDef);
    });

    bus.on('command:updateDefinition', (cmd) => {
        const def = getState().definitions.find(d => d.id === cmd.id);
        const previous: Partial<DataDefinition> = {};
        if (def) {
            Object.keys(cmd.changes).forEach(key => {
                previous[key as keyof DataDefinition] = def[key as keyof DataDefinition] as any;
            });
        }

        // Persistence
        const modelId = getModelId();
        const sanitizedChanges: Partial<GunPersisted<DataDefinition>> = {};
        Object.entries(cmd.changes).forEach(([key, value]) => {
            if (value === undefined) {
                sanitizedChanges[key as keyof DataDefinition] = null;
            } else if (key === 'attributes' && Array.isArray(value)) {
                // @ts-ignore - manual stringify override
                sanitizedChanges[key] = JSON.stringify(value);
            } else {
                sanitizedChanges[key as keyof DataDefinition] = value as any;
            }
        });
        console.log(`[DictionaryCommands] Updating definition in Gun (${modelId}):`, sanitizedChanges);
        gunService.getModel(modelId).get('definitions').get(cmd.id).put(sanitizedChanges);

        bus.emit('definition:updated', { id: cmd.id, changes: cmd.changes, previous });
    });

    bus.on('command:deleteDefinition', (cmd) => {
        const def = getState().definitions.find(d => d.id === cmd.id);
        if (def) {
            const modelId = getModelId();
            gunService.getModel(modelId).get('definitions').get(cmd.id).put(null);
            bus.emit('definition:deleted', { id: cmd.id, definition: def });
        }
    });
};
