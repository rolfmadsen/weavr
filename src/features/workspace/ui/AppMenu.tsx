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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

interface AppMenuProps {
    trigger: React.ReactElement;
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
        <>
            <DropdownMenu>
                <DropdownMenuTrigger>
                    {trigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[240px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl rounded-xl p-1.5" align="start">
                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('workspace.header.project')}
                        </DropdownMenuLabel>
                        
                        <DropdownMenuItem onClick={onOpenModelList} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <Folder size={16} /> {t('workspace.header.modelList')}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={handleOpenClick} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <Upload size={16} /> {t('workspace.header.openFromFile')}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onExport} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <Download size={16} /> {t('workspace.header.exportJson')}
                        </DropdownMenuItem>

                        {onStandardExport && (
                            <DropdownMenuItem onClick={onStandardExport} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                                <LogOut size={16} /> {t('workspace.header.exportStandard')}
                            </DropdownMenuItem>
                        )}

                        <DropdownMenuItem onClick={handleMergeClick} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <Upload size={16} /> {t('workspace.header.importToCurrent')}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800 my-1.5" />

                    <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {t('workspace.header.viewAndHelp')}
                        </DropdownMenuLabel>

                        <DropdownMenuItem onClick={onGenerateDocs} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <FileText size={16} /> {t('workspace.header.generateDocs')}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            <span>{resolvedTheme === 'dark' ? t('workspace.header.lightMode') : t('workspace.header.darkMode')}</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={onOpenHelp} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors border-none!">
                            <CircleHelp size={16} /> {t('workspace.header.helpGuide')}
                        </DropdownMenuItem>
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden File Input for Open/Merge */}
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </>
    );
};
