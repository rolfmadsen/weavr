import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Slice } from '../../modeling';
import {
    Filter,
    X,
    SquareCheck,
    Square,
    Check
} from 'lucide-react';
import { GlassInput } from '../../../shared/components/GlassInput';
import { GlassCard } from '../../../shared/components/GlassCard';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SliceFilterProps {
    slices: Slice[];
    hiddenSliceIds: string[];
    onChange: (ids: string[]) => void;
}

const SliceFilter: React.FC<SliceFilterProps> = ({ slices, hiddenSliceIds, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Filter slices based on search AND sort by order
    const displayedSlices = useMemo(() => {
        let result = slices;
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = slices.filter(s => (s.title || 'Untitled').toLowerCase().includes(lower));
        }
        return [...result].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [slices, searchTerm]);

    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSelectedIndex(0);
    }, [displayedSlices.length]);

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

    const handleToggleSlice = (id: string) => {
        if (hiddenSliceIds.includes(id)) {
            onChange(hiddenSliceIds.filter(sId => sId !== id));
        } else {
            onChange([...hiddenSliceIds, id]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchTerm('');
            setIsCollapsed(true);
            return;
        }

        if (displayedSlices.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % displayedSlices.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + displayedSlices.length) % displayedSlices.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < displayedSlices.length) {
                handleToggleSlice(displayedSlices[selectedIndex].id);
            }
        }
    };

    const handleShowVisible = () => {
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = hiddenSliceIds.filter(id => !displayedIds.includes(id));
        onChange(newHidden);
    };

    const handleHideVisible = () => {
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = Array.from(new Set([...hiddenSliceIds, ...displayedIds]));
        onChange(newHidden);
    };

    if (slices.length === 0) return null;

    if (isCollapsed) {
        return (
            <Tooltip.Provider>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <button
                            onClick={() => setIsCollapsed(false)}
                            className="w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border border-white/20 dark:border-white/10 hover:scale-110 hover:border-indigo-400 hover:text-indigo-600 transition-all mb-4 text-slate-500 dark:text-slate-400 relative"
                        >
                            <Filter size={20} className={hiddenSliceIds.length > 0 ? "text-indigo-600" : "text-slate-500"} />
                            {hiddenSliceIds.length > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
                            )}
                        </button>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                        <Tooltip.Content className="px-2 py-1 text-xs bg-black text-white rounded mb-2 z-[100]">
                            Filter Slices
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
            className="w-64 max-h-[400px] flex flex-col mb-4 overflow-hidden !p-0 !rounded-xl"
        >
            {/* Header */}
            <div className="p-3 border-b border-gray-200/50 dark:border-white/10 bg-white/30 dark:bg-black/30 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-2 text-slate-700 dark:text-slate-200 font-semibold text-sm">
                    <span className="flex-1">Filter Slices</span>
                    <button onClick={() => setIsCollapsed(true)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                        <X size={16} />
                    </button>
                </div>
                <GlassInput
                    placeholder="Search slices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="!py-1.5 !px-3 !text-sm"
                    startIcon={null}
                />
            </div>

            {/* Actions */}
            <div className="px-3 py-2 flex justify-between items-center border-b border-gray-200/30 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    {slices.length - hiddenSliceIds.length} Slices Visible
                </span>
                <div className="flex gap-1">
                    <button onClick={handleShowVisible} className="p-1 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Show All Visible">
                        <SquareCheck size={16} />
                    </button>
                    <button onClick={handleHideVisible} className="p-1 text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Hide All Visible">
                        <Square size={16} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div
                ref={listRef}
                className="overflow-y-auto flex-1 max-h-[250px] custom-scrollbar"
            >
                {displayedSlices.length === 0 ? (
                    <p className="p-4 text-center text-xs text-slate-400 italic">No slices found</p>
                ) : (
                    displayedSlices.map((slice, index) => {
                        const isHighlighted = index === selectedIndex;
                        const isVisible = !hiddenSliceIds.includes(slice.id);
                        return (
                            <div
                                key={slice.id}
                                onClick={() => handleToggleSlice(slice.id)}
                                className={`
                                    flex items-center px-3 py-2 cursor-pointer transition-colors border-l-4
                                    ${isHighlighted ? 'bg-indigo-50/50 dark:bg-indigo-500/20' : 'hover:bg-slate-50/50 dark:hover:bg-white/5'}
                                    ${isVisible ? 'border-indigo-500' : 'border-transparent text-slate-400 dark:text-slate-500'}
                                `}
                            >
                                <div className={`
                                    w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors
                                    ${isVisible ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'}
                                `}>
                                    {isVisible && <Check size={10} className="text-white" />}
                                </div>

                                <span className={`text-sm truncate flex-1 ${isVisible ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-700'}`}>
                                    {slice.title || 'Untitled'}
                                </span>

                                <div
                                    className="w-2 h-2 rounded-full ml-2 shadow-sm"
                                    style={{ backgroundColor: slice.color }}
                                />
                            </div>
                        );
                    })
                )}
            </div>
        </GlassCard>
    );
};

export default SliceFilter;
