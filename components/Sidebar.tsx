import React, { useEffect, useRef } from 'react';
import { CloseIcon } from './icons';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    tabs?: { id: string; label: string; title?: string }[];
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    title,
    children,
    activeTab,
    onTabChange,
    tabs
}) => {


    const sidebarRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Strict Focus Cycling
    useEffect(() => {
        const handleTabKey = (e: KeyboardEvent) => {
            if (!isOpen || e.key !== 'Tab' || !contentRef.current) return;

            const focusableElements = Array.from(contentRef.current.querySelectorAll(
                'button:not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), textarea:not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
            )) as HTMLElement[];

            if (focusableElements.length === 0) return;

            e.preventDefault(); // Always prevent default to keep focus strictly inside

            const activeElement = document.activeElement as HTMLElement;
            const currentIndex = focusableElements.indexOf(activeElement);

            let nextIndex;
            if (e.shiftKey) {
                // Shift + Tab: Previous element
                nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
            } else {
                // Tab: Next element
                nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
            }

            focusableElements[nextIndex].focus();
        };

        window.addEventListener('keydown', handleTabKey);
        return () => window.removeEventListener('keydown', handleTabKey);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div ref={sidebarRef} className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col border-l border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center space-x-4">
                    {tabs && tabs.length > 0 ? (
                        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => onTabChange?.(tab.id)}
                                    title={tab.title}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <CloseIcon className="text-xl" />
                </button>
            </div>

            {/* Content */}
            <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
                {children}
            </div>
        </div>
    );
};

export default Sidebar;
