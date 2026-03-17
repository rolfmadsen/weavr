import React, { useEffect, useState, useCallback, useRef } from 'react';
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
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on ESC and focus trapping
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }

            if (e.key === 'Tab') {
                const sidebar = sidebarRef.current;
                if (!sidebar) return;

                const focusableElements = sidebar.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ) as NodeListOf<HTMLElement>;

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept early
        }
        return () => window.removeEventListener('keydown', handleKeyDown, true);
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
        if (isOpen && activeTab) {
            // Wait for children to render
            const timerId = setTimeout(() => {
                const sidebar = sidebarRef.current;
                if (!sidebar) return;

                // 1. If focus is already inside the sidebar (e.g. focused by PropertiesPanel)
                // we don't want to steal it.
                if (sidebar.contains(document.activeElement)) {
                    return;
                }

                // 2. If we are on the properties tab, we defer to PropertiesPanel for focus
                if (activeTab === 'properties') {
                    return;
                }

                // 3. Otherwise, find the first focusable element in the content area
                const contentContainer = sidebar.querySelector('.overflow-y-auto');
                const focusableInContent = contentContainer?.querySelectorAll(
                    'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                ) as NodeListOf<HTMLElement>;

                if (focusableInContent && focusableInContent.length > 0) {
                    focusableInContent[0].focus();
                } else {
                    // Fallback to any focusable element in the sidebar (like tabs)
                    const allFocusable = sidebar.querySelectorAll(
                        'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
                    ) as NodeListOf<HTMLElement>;
                    if (allFocusable.length > 0) {
                        allFocusable[0].focus();
                    }
                }
            }, 150);
            return () => clearTimeout(timerId);
        }
    }, [activeTab, isOpen]);

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
                ref={sidebarRef}
                id="sidebar"
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
                        <nav className="flex space-x-1 overflow-x-auto no-scrollbar" aria-label="Tabs" role="tablist">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => onTabChange?.(tab.id)}
                                    className={cn(
                                        "hs-tab-active:bg-white hs-tab-active:text-purple-600 hs-tab-active:shadow-sm dark:hs-tab-active:bg-slate-800 dark:hs-tab-active:text-purple-300",
                                        "py-2 px-4 inline-flex items-center gap-x-2 bg-transparent text-sm font-medium text-slate-500 hover:text-purple-600 rounded-lg disabled:opacity-50 disabled:pointer-events-none dark:text-slate-400 dark:hover:text-purple-300",
                                        activeTab === tab.id && "active bg-white text-purple-600 shadow-sm dark:bg-slate-800 dark:text-purple-300"
                                    )}
                                    id={`sidebar-tab-${tab.id}`}
                                    aria-selected={activeTab === tab.id}
                                    role="tab"
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
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
