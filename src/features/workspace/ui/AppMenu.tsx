import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                {trigger}
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    className="min-w-[240px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 border border-slate-200 dark:border-slate-800"
                    sideOffset={8}
                    align="start"
                >
                    {/* Project Section */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</div>

                    <DropdownMenu.Item onClick={onOpenModelList} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <Folder size={16} /> My Models
                    </DropdownMenu.Item>

                    <DropdownMenu.Item onClick={handleOpenClick} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <Upload size={16} /> Open from File...
                    </DropdownMenu.Item>

                    <DropdownMenu.Item onClick={onExport} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <Download size={16} /> Export JSON
                    </DropdownMenu.Item>

                    {onStandardExport && (
                        <DropdownMenu.Item onClick={onStandardExport} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                            <LogOut size={16} /> Export Standard
                        </DropdownMenu.Item>
                    )}

                    <DropdownMenu.Item onClick={handleMergeClick} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <Upload size={16} /> Import to Current
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator className="h-px bg-slate-100 dark:bg-slate-800 my-1.5" />

                    {/* View & Help Section */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">View & Help</div>

                    <DropdownMenu.Item onClick={onGenerateDocs} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <FileText size={16} /> Generate Docs
                    </DropdownMenu.Item>

                    <DropdownMenu.Item onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                        {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </DropdownMenu.Item>

                    <DropdownMenu.Item onClick={onOpenHelp} className="flex items-center gap-2 px-2 py-2 text-sm text-slate-700 dark:text-slate-200 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer outline-none transition-colors">
                        <CircleHelp size={16} /> Help Guide
                    </DropdownMenu.Item>

                </DropdownMenu.Content>
            </DropdownMenu.Portal>

            {/* Hidden File Input for Open/Merge */}
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </DropdownMenu.Root>
    );
};
