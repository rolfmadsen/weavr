import { useState, useEffect, useCallback } from 'react';

export interface ModelMetadata {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
}

export const STORAGE_KEY = 'weavr_model_index';

export function useModelList() {
    const [models, setModels] = useState<ModelMetadata[]>([]);

    // Load models from localStorage on mount
    useEffect(() => {
        const loadModels = () => {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    setModels(JSON.parse(stored));
                }
            } catch (error) {
                console.error('Failed to load model list:', error);
            }
        };

        loadModels();

        // Listen for storage events (in case of multiple tabs)
        window.addEventListener('storage', loadModels);
        // Listen for custom event (in case of same tab updates)
        window.addEventListener('local-storage-models-update', loadModels);

        return () => {
            window.removeEventListener('storage', loadModels);
            window.removeEventListener('local-storage-models-update', loadModels);
        };
    }, []);

    const saveModels = (newModels: ModelMetadata[]) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newModels));
            setModels(newModels);
            // Dispatch custom event to notify other hook instances
            window.dispatchEvent(new Event('local-storage-models-update'));
        } catch (error) {
            console.error('Failed to save model list:', error);
        }
    };

    const addModel = useCallback((id: string, name: string) => {
        setModels(currentModels => {
            // Check if already exists
            if (currentModels.some(m => m.id === id)) {
                return currentModels;
            }

            const newModel: ModelMetadata = {
                id,
                name,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            const updated = [newModel, ...currentModels];
            saveModels(updated);
            return updated;
        });
    }, []);

    const updateModel = useCallback((id: string, updates: Partial<ModelMetadata>) => {
        setModels(currentModels => {
            const updated = currentModels.map(m =>
                m.id === id ? { ...m, ...updates, updatedAt: Date.now() } : m
            );
            saveModels(updated);
            return updated;
        });
    }, []);

    const removeModel = useCallback((id: string) => {
        setModels(currentModels => {
            const updated = currentModels.filter(m => m.id !== id);
            saveModels(updated);
            return updated;
        });
    }, []);

    return {
        models,
        addModel,
        updateModel,
        removeModel
    };
}
