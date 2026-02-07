import { bus } from '../../../shared/events/eventBus';
import gunService from '../../collaboration/store/gunClient';
import { getModelId } from '../../../shared/utils/modelUtils';

import { initNodeCommands } from '../../nodes/domain/nodeCommands';
import { initLinkCommands } from '../../links/domain/linkCommands';
import { initSliceCommands } from '../../slices/domain/sliceCommands';
import { initActorCommands } from '../../actors/domain/actorCommands';
import { initDictionaryCommands } from '../../dictionary/domain/dictionaryCommands';

// Initialization function to bind listeners
export const initCommandHandler = () => {

    // Initialize feature-specific command handlers
    initNodeCommands();
    initLinkCommands();
    initSliceCommands();
    initActorCommands();
    initDictionaryCommands();

    // ------------------------------------------------------------------
    // MODEL COMMANDS (Global meta commands kept here for now)
    // ------------------------------------------------------------------
    bus.on('command:updateModelName', (cmd) => {
        const modelId = getModelId();
        gunService.getModel(modelId).get('meta').put({ name: cmd.name });
        bus.emit('modelName:updated', { name: cmd.name });
    });
};
