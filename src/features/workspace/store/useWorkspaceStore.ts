import { create } from 'zustand';
import i18n from '../../../shared/i18n/config';

interface WorkspaceState {
    language: string;
    setLanguage: (language: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
    language: i18n.language || 'en',
    setLanguage: (language) => set({ language }),
}));
