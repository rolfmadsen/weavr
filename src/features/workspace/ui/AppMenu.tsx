import React from 'react';
import {
    Folder,
    Upload,
    Download,
    FileText,
    Sun,
    Moon,
    CircleHelp,
    LogOut
} from 'lucide-react';
import { useTheme } from '../../../shared/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';

interface AppMenuProps {
    trigger: React.ReactNode;
    onOpenModelList: () => void;
    onOpen: (file: File) => void;
    onMerge: (file: File) => void;
    onExport: () => void;
    onStandardExport?: () => void;
    onGenerateDocs: () => void;
    onOpenHelp: () => void;
}

export const AppMenu: React.FC<AppMenuProps> = ({
    trigger,
    onOpenModelList,
    onOpen,
    onMerge,
    onExport,
    onStandardExport,
    onGenerateDocs,
    onOpenHelp
}) => {
    const { t } = useTranslation();
    const { resolvedTheme, setTheme } = useTheme();
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [importMode, setImportMode] = React.useState<'open' | 'merge'>('open');

    const handleOpenClick = () => { setImportMode('open'); fileInputRef.current?.click(); };
    const handleMergeClick = () => { setImportMode('merge'); fileInputRef.current?.click(); };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            importMode === 'open' ? onOpen(file) : onMerge(file);
        }
        event.target.value = '';
    };

    return (
        <div className="hs-dropdown relative inline-flex">
            <button id="hs-dropdown-app-menu" type="button" className="hs-dropdown-toggle">
                {trigger}
            </button>

            <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden min-w-[240px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 z-50 border border-white/20 dark:border-white/10" aria-labelledby="hs-dropdown-app-menu">
                {/* Project Section */}
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('workspace.header.project')}</div>

                <button onClick={onOpenModelList} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <Folder size={16} /> {t('workspace.header.modelList')}
                </button>

                <button onClick={handleOpenClick} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <Upload size={16} /> {t('workspace.header.openFromFile')}
                </button>

                <button onClick={onExport} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <Download size={16} /> {t('workspace.header.exportJson')}
                </button>

                {onStandardExport && (
                    <button onClick={onStandardExport} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <LogOut size={16} /> {t('workspace.header.exportStandard')}
                    </button>
                )}

                <button onClick={handleMergeClick} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <Upload size={16} /> {t('workspace.header.importToCurrent')}
                </button>

                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1.5" />

                {/* View & Help Section */}
                <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('workspace.header.viewAndHelp')}</div>

                <button onClick={onGenerateDocs} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <FileText size={16} /> {t('workspace.header.generateDocs')}
                </button>

                <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span className="ml-0">{resolvedTheme === 'dark' ? t('workspace.header.lightMode') : t('workspace.header.darkMode')}</span>
                </button>

                <button onClick={onOpenHelp} className="w-full flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                    <CircleHelp size={16} /> {t('workspace.header.helpGuide')}
                </button>

            </div>

            {/* Hidden File Input for Open/Merge */}
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
    );
};
