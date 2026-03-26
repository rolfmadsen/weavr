import React, { useEffect, useState, useCallback } from 'react';
import { XIcon } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import {
    Sheet,
    SheetContent,
} from "../../../shared/components/ui/sheet";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "../../../shared/components/ui/tabs";
import { Button } from "../../../shared/components/ui/button";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    tabs?: { id: string; label: string; title?: string }[];
    width: number;
    onWidthChange: (width: number) => void;
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    title,
    children,
    activeTab,
    onTabChange,
    tabs,
    width,
    onWidthChange
}) => {
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key !== 'Tab' || !contentRef.current) return;

        // Check if focus is actually inside the sidebar
        if (!contentRef.current.contains(document.activeElement)) return;

        const allFocusable = contentRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        // Filter for visible elements
        const focusableElements = Array.from(allFocusable).filter(el => {
            const htmlEl = el as HTMLElement;
            return !!(htmlEl.offsetWidth || htmlEl.offsetHeight || htmlEl.getClientRects().length);
        }) as HTMLElement[];

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                e.preventDefault();
                // Use a small timeout to ensure browser state is ready
                setTimeout(() => firstElement.focus(), 0);
            }
        }
    }, []);

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
                onWidthChange(newWidth);
            }
        }
    }, [isResizing, onWidthChange]);

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
        <Sheet 
            open={isOpen} 
            modal={false}
            onOpenChange={(open, eventDetails) => {
                if (!open && eventDetails.reason === 'escape-key') {
                    onClose();
                }
            }}
        >
            <SheetContent 
                side="right" 
                showCloseButton={false}
                hideOverlay
                ref={contentRef}
                onKeyDown={handleKeyDown}
                className={cn(
                    "glass-card flex flex-col p-0 border-none shadow-2xl transition-none",
                    !isResizing && "transition-transform"
                )}
                style={{ width: width, maxWidth: 'none' }}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize z-50 hover:bg-primary/20 active:bg-primary/40 transition-colors"
                />

                {/* Header */}
                <header className="flex items-center justify-between p-4 border-b border-white/10 h-16 shrink-0 bg-white/5">
                    {tabs && tabs.length > 0 ? (
                        <div className="flex-1 overflow-x-auto no-scrollbar">
                            <Tabs value={activeTab} onValueChange={onTabChange}>
                                <TabsList className="bg-transparent border-none gap-2">
                                    {tabs.map(tab => (
                                        <TabsTrigger
                                            key={tab.id}
                                            value={tab.id}
                                            data-state={activeTab === tab.id ? 'active' : 'inactive'}
                                            aria-label={tab.title}
                                            className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary dark:data-[state=active]:bg-primary/20"
                                        >
                                            {tab.label}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>
                        </div>
                    ) : (
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white truncate px-2">
                            {title}
                        </h2>
                    )}

                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={onClose}
                        className="rounded-full hover:bg-white/10 dark:hover:bg-white/5"
                    >
                        <XIcon size={20} />
                    </Button>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 custom-scrollbar">
                    {children}
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default Sidebar;
