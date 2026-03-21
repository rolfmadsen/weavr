import React from 'react';
import { useTranslation } from 'react-i18next';
import { bus } from '../../../shared/events/eventBus';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { Globe } from 'lucide-react';

export const LanguageSelector: React.FC = () => {
    const { t } = useTranslation();
    const currentLanguage = useWorkspaceStore((state) => state.language);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        // Capture intent and emit command
        bus.emit('workspace:changeLanguage', { languageCode: e.target.value });
    };

    return (
        <div className="flex items-center gap-2 px-2 py-1 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg backdrop-blur-sm">
            <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <select
                id="language-select"
                value={currentLanguage}
                onChange={handleLanguageChange}
                className="bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none pe-8"
                aria-label={t('common.language')}
            >
                <option value="en" className="bg-white dark:bg-slate-900">{t('common.english')}</option>
                <option value="da" className="bg-white dark:bg-slate-900">{t('common.danish')}</option>
                <option value="de" className="bg-white dark:bg-slate-900">{t('common.german')}</option>
                <option value="fr" className="bg-white dark:bg-slate-900">{t('common.french') || 'French'}</option>
            </select>
        </div>
    );
};
