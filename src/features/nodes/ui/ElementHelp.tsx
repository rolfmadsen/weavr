import React from 'react';
import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';
import { ElementType } from '../../modeling';

export const ElementHelp: React.FC<{ type: ElementType }> = ({ type }) => {
    const { t } = useTranslation();
    
    return (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-black/20 rounded-xl border border-purple-100 dark:border-white/10 text-sm">
            <div className="flex gap-2 items-center mb-3 text-purple-600 dark:text-purple-400">
                <Info size={16} />
                <span className="font-bold">{t(`modeling.elements.${type}_title`)}</span>
            </div>

            <div className="mb-3">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">{t('help.elements.role')}</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t(`modeling.elements.${type}_purpose`)}</p>
            </div>

            <div className="mb-3">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">{t('help.elements.story')}</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{t(`modeling.elements.${type}_story`)}</p>
            </div>

            <div className="mb-3">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1">{t('help.elements.technicalMeaning')}</span>
                <code className="text-xs bg-slate-200 dark:bg-black/40 px-1 py-0.5 rounded text-purple-700 dark:text-purple-300 block w-full overflow-x-auto">{t(`modeling.elements.${type}_tech`)}</code>
            </div>
        </div>
    );
};
