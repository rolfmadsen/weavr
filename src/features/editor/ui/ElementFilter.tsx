import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Node } from '../../modeling';
import {
    Search,
    X,
    Target
} from 'lucide-react';
import { ELEMENT_STYLE } from '../../../shared/constants';
import { GlassInput } from '../../../shared/components/GlassInput';
import { GlassCard } from '../../../shared/components/GlassCard';
import * as Tooltip from '@radix-ui/react-tooltip';

interface ElementFilterProps {
    nodes: Node[];
    onNodeClick: (node: Node) => void;
}

const ElementFilter: React.FC<ElementFilterProps> = ({ nodes, onNodeClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fuzzy search nodes based on name and type
    const displayedNodes = useMemo(() => {
        if (!searchTerm.trim()) return [];

        const lower = searchTerm.toLowerCase();
        return nodes.filter(n =>
            (n.name || '').toLowerCase().includes(lower) ||
            (n.type || '').toLowerCase().includes(lower)
        ).slice(0, 20); // Limit results for performance
    }, [nodes, searchTerm]);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedIndex(0);
    }, [displayedNodes.length]);

    useEffect(() => {
        if (listRef.current && selectedIndex >= 0) {
            const container = listRef.current;
            const activeItem = container.children[selectedIndex] as HTMLElement;
            if (activeItem) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const itemTop = activeItem.offsetTop;
                const itemBottom = itemTop + activeItem.offsetHeight;

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            setSearchTerm('');
            setIsCollapsed(true);
            return;
        }

        if (displayedNodes.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % displayedNodes.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + displayedNodes.length) % displayedNodes.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < displayedNodes.length) {
                onNodeClick(displayedNodes[selectedIndex]);
            }
        }
    };


    if (isCollapsed) {
        return (
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border border-white/20 dark:border-white/10 hover:scale-110 hover:border-indigo-400 hover:text-indigo-600 transition-all mb-4 text-slate-500 dark:text-slate-400"
                        >
                            <Search size={20} />
                        </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                        <Tooltip.Content className="px-2 py-1 text-xs bg-black text-white rounded mb-2 z-[100]">
                            Find Element
                            <Tooltip.Arrow className="fill-black" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>
        );
    }

    return (
        <GlassCard
            variant="panel"
            className="w-64 max-h-[500px] flex flex-col mb-4 overflow-hidden !p-0 !rounded-xl"
        >
            <div className="p-3 border-b border-gray-200/50 dark:border-white/10 bg-white/20 dark:bg-black/20 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    <span className="flex-1">Find Element</span>
                    <button onClick={() => setIsCollapsed(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <X size={16} />
                    </button>
                </div>
                <GlassInput
                    placeholder="Search elements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="!py-1.5 !px-3 !text-sm"
                />
            </div>

            <div
                ref={listRef}
                className="overflow-y-auto flex-1 max-h-[350px] custom-scrollbar"
            >
                {searchTerm && displayedNodes.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400 italic">No elements found</p>
                ) : (
                    displayedNodes.map((node, index) => {
                        const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE];
                        const isHighlighted = index === selectedIndex;
                        return (
                            <div
                                key={node.id}
                                onClick={() => onNodeClick(node)}
                                className={`
                                    flex items-center px-3 py-2 cursor-pointer transition-colors
                                    ${isHighlighted ? 'bg-indigo-50/50 dark:bg-indigo-500/20 border-l-4 border-indigo-500 pl-2' : 'hover:bg-slate-50/30 dark:hover:bg-white/5 border-l-4 border-transparent pl-2'}
                                `}
                            >
                                <div
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold mr-3 shadow-sm"
                                    style={{ backgroundColor: style?.color || '#9ca3af' }}
                                >
                                    {node.type?.charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 overflow-hidden">
                                    <div className={`text-sm truncate ${isHighlighted ? 'font-semibold text-indigo-900 dark:text-indigo-200' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                                        {node.name || 'Untitled'}
                                    </div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                                        {node.type?.replace(/_/g, ' ')}
                                    </div>
                                </div>

                                <Target size={16} className={isHighlighted ? "text-indigo-600 dark:text-indigo-400" : "text-slate-200 dark:text-slate-700"} />
                            </div>
                        );
                    })
                )}
            </div>
        </GlassCard>
    );
};

export default ElementFilter;
