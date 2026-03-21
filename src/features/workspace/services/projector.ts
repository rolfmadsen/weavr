import { bus } from '../../../shared/events/eventBus';
import { WorkspaceEvent } from '../../../shared/events/types';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import i18n from '../../../shared/i18n/config';

export const initWorkspaceProjector = () => {
    bus.on('workspace:languageChanged', (event: WorkspaceEvent['payload']) => {
        // 1. Update i18next instance
        i18n.changeLanguage(event.languageCode);

        // 2. Update Zustand store
        useWorkspaceStore.getState().setLanguage(event.languageCode);
        
        // 3. Persist to localStorage (i18next-browser-languagedetector usually does this, but being explicit is fine)
        localStorage.setItem('i18nextLng', event.languageCode);
    });
};
