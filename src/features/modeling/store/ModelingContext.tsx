
import React, { createContext, useContext, ReactNode } from 'react';
import { useModelingStore } from '../store/useModelingStore';

type ModelingStore = ReturnType<typeof useModelingStore>;

const ModelingContext = createContext<ModelingStore | null>(null);

export const ModelingProvider: React.FC<{ store: ModelingStore; children: ReactNode }> = ({ store, children }) => {
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
