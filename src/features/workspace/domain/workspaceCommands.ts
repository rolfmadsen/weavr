import { bus } from '../../../shared/events/eventBus';
import { WorkspaceCommand } from '../../../shared/events/types';

export const initWorkspaceCommands = () => {
    bus.on('workspace:changeLanguage', (cmd: WorkspaceCommand['payload']) => {
        const supportedLanguages = ['en', 'da', 'de', 'fr'];
        if (supportedLanguages.includes(cmd.languageCode)) {
            bus.emit('workspace:languageChanged', { languageCode: cmd.languageCode });
        }
    });
};
