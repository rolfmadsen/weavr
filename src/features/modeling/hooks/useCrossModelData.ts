import { useState, useEffect } from 'react';
import { gunClient } from '../../collaboration';
import { useModelList } from './useModelList';

export interface CrossModelItem {
    id: string;
    label: string;
    modelId: string;
    modelName: string;
    type: 'slice' | 'definition';
    originalData?: any;
}

export function useCrossModelData(currentModelId: string | null) {
    const { models } = useModelList();
    const [crossModelSlices, setCrossModelSlices] = useState<CrossModelItem[]>([]);
    const [crossModelDefinitions, setCrossModelDefinitions] = useState<CrossModelItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!currentModelId || models.length <= 1) return;

        setIsLoading(true);

        const otherModels = models.filter(m => m.id !== currentModelId);
        const fetchedSlices: CrossModelItem[] = [];
        const fetchedDefinitions: CrossModelItem[] = [];

        otherModels.forEach(model => {
            const gun = gunClient.getModel(model.id);

            // Fetch Slices
            // We use map().once() to get each slice once
            gun.get('slices').map().once((data: any, key: string) => {
                if (data && data.title) {
                    fetchedSlices.push({
                        id: key, // This is the slice ID in the OTHER model
                        label: data.title,
                        modelId: model.id,
                        modelName: model.name,
                        type: 'slice',
                        originalData: data
                    });
                    // Update state progressively or debounce?
                    // For now, let's just update at the end or periodically?
                    // React state updates in loops are bad.
                    // Let's update after a timeout or when all are done?
                    // Gun is async, so "all done" is hard to know.
                    // We'll use a debounce approach.
                    scheduleUpdate();
                }
            });

            // Fetch Definitions
            gun.get('definitions').map().once((data: any, key: string) => {
                if (data && data.name) {
                    fetchedDefinitions.push({
                        id: key,
                        label: data.name,
                        modelId: model.id,
                        modelName: model.name,
                        type: 'definition',
                        originalData: data
                    });
                    scheduleUpdate();
                }
            });
        });

        let timeout: any;
        const scheduleUpdate = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setCrossModelSlices([...fetchedSlices]);
                setCrossModelDefinitions([...fetchedDefinitions]);
                setIsLoading(false); // Rough approximation
            }, 500);
        };

        return () => clearTimeout(timeout);

    }, [currentModelId, models.length]); // Re-run if model list changes

    return {
        crossModelSlices,
        crossModelDefinitions,
        isLoading
    };
}
