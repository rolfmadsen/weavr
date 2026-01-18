import { useState, useCallback, useEffect } from 'react';
import { useModelList } from '../../modeling';

interface UseWorkspaceManagerProps {
    modelId: string | null;
}

export function useWorkspaceManager({ modelId }: UseWorkspaceManagerProps) {
    const [focusOnRender, setFocusOnRender] = useState(false);
    const [isToolbarOpen, setIsToolbarOpen] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isModelListOpen, setIsModelListOpen] = useState(false);
    const [hiddenSliceIds, setHiddenSliceIds] = useState<string[]>([]);
    const [activeSliceId, setActiveSliceId] = useState<string | null>(null);
    const [isSliceManagerOpen, setIsSliceManagerOpen] = useState(false);
    const [sliceManagerInitialId, setSliceManagerInitialId] = useState<string | null>(null);
    const [sidebarView, setSidebarView] = useState<'properties' | 'slices' | 'dictionary' | null>(null);

    // View state persistence
    const [viewState, setViewState] = useState(() => {
        const stored = localStorage.getItem('weavr-view-state');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse view state", e);
            }
        }
        return { x: 0, y: 0, scale: 1 };
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem('weavr-view-state', JSON.stringify(viewState));
        }, 500);
        return () => clearTimeout(timer);
    }, [viewState]);

    const { models, updateModel, addModel } = useModelList();

    useEffect(() => {
        if (modelId) {
            addModel(modelId, 'Untitled Model');
        }
    }, [modelId, addModel]);

    const handleRenameModel = useCallback((newName: string) => {
        if (modelId) {
            updateModel(modelId, { name: newName });
        }
    }, [modelId, updateModel]);

    const currentModelName = models.find(m => m.id === modelId)?.name || 'Untitled Model';

    return {
        focusOnRender, setFocusOnRender,
        isToolbarOpen, setIsToolbarOpen,
        isHelpModalOpen, setIsHelpModalOpen,
        isModelListOpen, setIsModelListOpen,
        hiddenSliceIds, setHiddenSliceIds,
        activeSliceId, setActiveSliceId,
        isSliceManagerOpen, setIsSliceManagerOpen,
        sliceManagerInitialId, setSliceManagerInitialId,
        sidebarView, setSidebarView,
        viewState, setViewState,
        models,
        currentModelName,
        handleRenameModel
    };
}
