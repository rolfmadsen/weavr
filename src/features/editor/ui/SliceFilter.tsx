import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Slice } from '../../modeling';
import {
    Filter,
    X,
    SquareCheck,
    Square,
    Check,
    Crosshair,
    Minus,
    Plus
} from 'lucide-react';
import { GlassInput } from '../../../shared/components/GlassInput';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassTooltip } from '../../../shared/components/GlassTooltip';

interface SliceFilterProps {
    slices: Slice[];
    hiddenSliceIds: string[];
    onChange: (ids: string[]) => void;
    focusModeEnabled?: boolean;
    onFocusModeChange?: (enabled: boolean) => void;
    focusModeSteps?: number;
    onFocusModeStepsChange?: (steps: number) => void;
    effectiveHiddenSliceIds?: string[];
}

const SliceFilter: React.FC<SliceFilterProps> = ({
    slices,
    hiddenSliceIds,
    onChange,
    focusModeEnabled = false,
    onFocusModeChange,
    focusModeSteps = 1,
    onFocusModeStepsChange,
    effectiveHiddenSliceIds
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Use effective hidden IDs (Focus Mode aware) for display
    const activeHiddenIds = effectiveHiddenSliceIds ?? hiddenSliceIds;

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
        if (focusModeEnabled) return; // Don't allow manual toggle when Focus Mode is active
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
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < displayedSlices.length) {
                handleToggleSlice(displayedSlices[selectedIndex].id);
            }
        }
    };

    const handleShowVisible = () => {
        if (focusModeEnabled) return;
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = hiddenSliceIds.filter(id => !displayedIds.includes(id));
        onChange(newHidden);
    };

    const handleHideVisible = () => {
        if (focusModeEnabled) return;
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = Array.from(new Set([...hiddenSliceIds, ...displayedIds]));
        onChange(newHidden);
    };

    if (slices.length === 0) return null;

    if (isCollapsed) {
        return (
            <GlassTooltip content={focusModeEnabled ? 'Focus Mode Active' : 'Filter Slices'}>
                <button
                    onClick={() => setIsCollapsed(false)}
                    className="w-10 h-10 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border border-white/20 dark:border-white/10 hover:border-purple-400 hover:text-purple-600 transition-all mb-4 text-slate-500 dark:text-slate-400 relative active:scale-95"
                >
                    {focusModeEnabled ? (
                        <Crosshair size={20} className="text-amber-500 animate-pulse" />
                    ) : (
                        <Filter size={20} className={activeHiddenIds.length > 0 ? "text-purple-600" : "text-slate-500"} />
                    )}
                    {(activeHiddenIds.length > 0 || focusModeEnabled) && (
                        <span className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${focusModeEnabled ? 'bg-amber-500' : 'bg-red-500'}`} />
                    )}
                </button>
            </GlassTooltip>
        );
    }

    const visibleCount = slices.length - activeHiddenIds.length;

    return (
        <GlassCard
            variant="panel"
            className="w-64 max-h-[450px] flex flex-col mb-4 overflow-hidden !p-0 !rounded-xl"
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

            {/* Focus Mode Controls */}
            {onFocusModeChange && (
                <div className={`px-3 py-2 flex items-center gap-2 border-b transition-colors ${
                    focusModeEnabled
                        ? 'border-amber-300/50 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/20'
                        : 'border-gray-200/30 dark:border-white/5 bg-black/3 dark:bg-white/3'
                }`}>
                    <GlassTooltip content={focusModeEnabled ? 'Disable Focus Mode' : 'Enable Focus Mode'}>
                        <button
                            onClick={() => onFocusModeChange(!focusModeEnabled)}
                            className={`p-1.5 rounded-lg transition-all ${
                                focusModeEnabled
                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105'
                                    : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30'
                            }`}
                        >
                            <Crosshair size={16} />
                        </button>
                    </GlassTooltip>

                    <span className={`text-[10px] font-semibold uppercase tracking-wider flex-1 ${
                        focusModeEnabled ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        Focus Mode
                    </span>

                    {focusModeEnabled && onFocusModeStepsChange && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onFocusModeStepsChange(Math.max(1, focusModeSteps - 1))}
                                disabled={focusModeSteps <= 1}
                                className="p-0.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Minus size={12} />
                            </button>
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 w-4 text-center tabular-nums">
                                {focusModeSteps}
                            </span>
                            <button
                                onClick={() => onFocusModeStepsChange(Math.min(5, focusModeSteps + 1))}
                                disabled={focusModeSteps >= 5}
                                className="p-0.5 rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={12} />
                            </button>
                            <span className="text-[9px] text-amber-600/60 dark:text-amber-400/60 ml-0.5">
                                steps
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="px-3 py-2 flex justify-between items-center border-b border-gray-200/30 dark:border-white/5 bg-black/5 dark:bg-white/5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                    {visibleCount} Slices Visible
                </span>
                <div className="flex gap-1">
                    <button
                        onClick={handleShowVisible}
                        disabled={focusModeEnabled}
                        className={`p-1 rounded-md transition-colors ${
                            focusModeEnabled
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-purple-600 dark:text-slate-500 dark:hover:text-purple-400 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        title="Show All Visible"
                    >
                        <SquareCheck size={16} />
                    </button>
                    <button
                        onClick={handleHideVisible}
                        disabled={focusModeEnabled}
                        className={`p-1 rounded-md transition-colors ${
                            focusModeEnabled
                                ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                : 'text-slate-400 hover:text-purple-600 dark:text-slate-500 dark:hover:text-purple-400 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        title="Hide All Visible"
                    >
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
                        const isVisible = !activeHiddenIds.includes(slice.id);
                        return (
                            <div
                                key={slice.id}
                                onClick={() => handleToggleSlice(slice.id)}
                                className={`
                                    flex items-center px-3 py-2 transition-colors border-l-4
                                    ${focusModeEnabled ? 'cursor-default' : 'cursor-pointer'}
                                    ${isHighlighted ? 'bg-purple-500/10 dark:bg-purple-500/20' : focusModeEnabled ? '' : 'hover:bg-slate-50/50 dark:hover:bg-white/5'}
                                    ${isVisible ? 'border-purple-500 font-medium' : 'border-transparent text-slate-400 dark:text-slate-500'}
                                `}
                            >
                                <div className={`
                                    w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors
                                    ${isVisible ? 'bg-purple-500 border-purple-500' : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900/50'}
                                    ${focusModeEnabled ? 'opacity-50' : ''}
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
