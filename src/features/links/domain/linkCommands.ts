import { v4 as uuidv4 } from 'uuid';
import { bus } from '../../../shared/events/eventBus';
import { useModelingData } from '../../modeling/store/modelingStore';
import { Link, GunPersisted } from '../../modeling/domain/types';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

export const initLinkCommands = () => {
    const getState = () => useModelingData.getState();

    // ------------------------------------------------------------------
    // LINK COMMANDS
    // ------------------------------------------------------------------
    bus.on('command:createLink', (cmd) => {
        const newLink: Link = {
            id: uuidv4(),
            source: cmd.sourceId,
            target: cmd.targetId,
            label: ''
        };

        // Persistence
        const modelId = getModelId();
        const linkData: GunPersisted<Link> = newLink as GunPersisted<Link>; // Link has no arrays currently
        gunService.getModel(modelId).get('links').get(newLink.id).put(linkData);

        bus.emit('link:created', newLink);
    });

    bus.on('command:deleteLink', (cmd) => {
        const link = getState().links.find(l => l.id === cmd.id);
        if (link) {
            const modelId = getModelId();
            gunService.getModel(modelId).get('links').get(cmd.id).put(null);
            bus.emit('link:deleted', { id: cmd.id, link });
        }
    });

    bus.on('command:updateLink', (cmd) => {
        const link = getState().links.find(l => l.id === cmd.id);
        const previous: Partial<Link> = {};
        if (link) {
            Object.keys(cmd.changes).forEach(key => {
                // Justification: TypeScript cannot correlate keys in loop.
                (previous as any)[key] = link[key as keyof Link];
            });
        }

        const modelId = getModelId();
        // Link has no complex fields, so partial updates are safe directly
        const changes: Partial<GunPersisted<Link>> = cmd.changes as Partial<GunPersisted<Link>>;
        gunService.getModel(modelId).get('links').get(cmd.id).put(changes);

        bus.emit('link:updated', {
            id: cmd.id,
            changes: cmd.changes,
            previous: Object.keys(previous).length > 0 ? previous : undefined
        });
    });
};
