import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    tabs?: { id: string; label: string; title?: string }[];
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384;

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    title,
    children,
    activeTab,
    onTabChange,
    tabs
}) => {
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);

    // Close on ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !e.defaultPrevented) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Panel */}
            <aside
                className={cn(
                    "fixed top-0 bottom-0 right-0 z-50 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl",
                    "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-white/20 dark:border-white/10",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
                style={{ width: isOpen ? width : 0, transitionProperty: isResizing ? 'none' : 'transform, width' }}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize z-50 hover:bg-purple-500/20 active:bg-purple-500/40 transition-colors"
                />

                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-700/50 h-16 shrink-0">
                    {tabs && tabs.length > 0 ? (
                        <div className="flex gap-1 overflow-x-auto no-scrollbar mask-gradient-r">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange?.(tab.id)}
                                    title={tab.title}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-300 ring-1 ring-purple-500/20"
                                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white truncate">
                            {title}
                        </h2>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 ml-2 rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {children}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
