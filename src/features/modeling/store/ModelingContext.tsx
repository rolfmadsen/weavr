
import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useModelingStore } from '../store/useModelingStore';
import { initCommandHandler } from '../services/commandHandler';
import { initProjector } from '../services/projector';

import { debugEvents } from '../../../shared/events/eventBus';
import { initUndoService } from '../services/undoService';

type ModelingStore = ReturnType<typeof useModelingStore>;

const ModelingContext = createContext<ModelingStore | null>(null);

export const ModelingProvider: React.FC<{ store: ModelingStore; children: ReactNode }> = ({ store, children }) => {

    // Initialize Event Driven Architecture Global Listeners
    useEffect(() => {
        initCommandHandler();
        initProjector();

        initUndoService();
        // Enable logging in dev mode or if explicitly enabled
        const debugEnabled = import.meta.env.DEV || (typeof window !== 'undefined' && window.localStorage.getItem('weavr:debug') === 'true');
        debugEvents(debugEnabled);
        if (debugEnabled) console.log('[Weavr] Event Bus Logging Enabled. (To disable: localStorage.removeItem("weavr:debug"))');
    }, []);

    return (
        <ModelingContext.Provider value={store}>
            {children}
        </ModelingContext.Provider>
    );
};

export const useModelingContext = () => {
    const context = useContext(ModelingContext);
    if (!context) {
        throw new Error('useModelingContext must be used within a ModelingProvider');
    }
    return context;
};
