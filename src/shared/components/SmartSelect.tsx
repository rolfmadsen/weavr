import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GlassInput } from './GlassInput';
import { ChevronDown, Plus } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
    group?: string;
    color?: string;
    inputValue?: string;
}

interface SmartSelectProps {
    options: Option[];
    value: string;
    onChange: (id: string, option?: Option) => void;
    onCreate?: (inputValue: string) => string | void;
    placeholder?: string;
    allowCustomValue?: boolean;
    onSearchChange?: (value: string) => void;
    autoFocus?: boolean;
}

const SmartSelect: React.FC<SmartSelectProps> = ({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    allowCustomValue = false,
    onSearchChange,
    autoFocus
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Sync internal input value with selected external value ID when not open/typing
    useEffect(() => {
        if (!isOpen) {
            const selected = options.find(o => o.id === value);
            if (selected) {
                setInputValue(selected.label);
            } else if (allowCustomValue && value) {
                setInputValue(value);
            } else {
                setInputValue('');
            }
        }
    }, [value, isOpen, options, allowCustomValue]);

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset input to current value on blur
                const selected = options.find(o => o.id === value);
                if (selected) setInputValue(selected.label);
                else if (allowCustomValue && value) setInputValue(value);
                else setInputValue('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options, allowCustomValue]);

    const filteredOptions = useMemo(() => {
        const lowerInput = inputValue.toLowerCase();
        let filtered = options.filter(o =>
            o.label.toLowerCase().includes(lowerInput) ||
            (o.subLabel && o.subLabel.toLowerCase().includes(lowerInput))
        );
        return filtered;
    }, [options, inputValue]);

    // Reset focused index when filtering changes
    useEffect(() => {
        setFocusedIndex(0);
    }, [filteredOptions.length]);

    const groupedOptions = useMemo(() => {
        const groups: Record<string, Option[]> = {};
        filteredOptions.forEach(opt => {
            const group = opt.group || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(opt);
        });
        return groups;
    }, [filteredOptions]);

    // Flatten options for easy index-based navigation
    const flatOptions = useMemo(() => {
        return Object.values(groupedOptions).flat();
    }, [groupedOptions]);

    const handleSelect = (option: Option) => {
        onChange(option.id, option);
        setInputValue(option.label);
        setIsOpen(false);
    };

    const handleCreate = () => {
        if (!inputValue.trim()) return;
        if (onCreate) {
            const id = onCreate(inputValue);
            if (id) {
                onChange(id, { id, label: inputValue });
            }
        } else if (allowCustomValue) {
            onChange(inputValue); // Use the string as ID
        }
        setIsOpen(false);
    };

    // Auto-scroll to focused item
    useEffect(() => {
        if (isOpen && listRef.current) {
            const list = listRef.current;
            // Find the element with data-index=focusedIndex
            const element = list.querySelector(`[data-index="${focusedIndex}"]`) as HTMLElement;
            if (element) {
                const listTop = list.scrollTop;
                const listBottom = listTop + list.clientHeight;
                const elTop = element.offsetTop;
                const elBottom = elTop + element.clientHeight;

                if (elTop < listTop) {
                    list.scrollTop = elTop;
                } else if (elBottom > listBottom) {
                    list.scrollTop = elBottom - list.clientHeight;
                }
            }
        }
    }, [focusedIndex, isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex(prev => (prev + 1) % flatOptions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex(prev => (prev - 1 + flatOptions.length) % flatOptions.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            // If we have filtered options and valid index, select it
            if (flatOptions.length > 0 && focusedIndex >= 0 && focusedIndex < flatOptions.length) {
                handleSelect(flatOptions[focusedIndex]);
            } else {
                // Determine if we should create
                const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === inputValue.toLowerCase());
                if (exactMatch) {
                    handleSelect(exactMatch);
                } else {
                    handleCreate();
                }
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current?.blur();
        }
    };

    const showCreateOption = inputValue.trim() &&
        !filteredOptions.some(o => o.label.toLowerCase() === inputValue.toLowerCase().trim()) &&
        (onCreate || allowCustomValue);

    return (
        <div className="relative w-full" ref={containerRef}>
            <GlassInput
                ref={inputRef}
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setIsOpen(true);
                    onSearchChange?.(e.target.value);
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                autoComplete="off"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[100] perspective-[1000px]">
                    <GlassCard variant="panel" className="p-1 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 origin-top">
                        <div ref={listRef} className="max-h-60 overflow-y-auto custom-scrollbar">
                            {Object.entries(groupedOptions).map(([group, opts]) => (
                                <div key={group}>
                                    {Object.keys(groupedOptions).length > 1 && (
                                        <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{group}</div>
                                    )}
                                    {opts.map(opt => {
                                        // Calculate global index for highlighting
                                        const globalIndex = flatOptions.indexOf(opt);
                                        const isFocused = globalIndex === focusedIndex;

                                        return (
                                            <button
                                                key={opt.id}
                                                data-index={globalIndex}
                                                onClick={() => handleSelect(opt)}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex flex-col group ${isFocused
                                                        ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300'
                                                        : 'hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-300'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">{opt.label}</span>
                                                    {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                                                </div>
                                                {opt.subLabel && <span className="text-xs text-slate-500">{opt.subLabel}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}

                            {showCreateOption && (
                                <div className="pt-1 mt-1 border-t border-slate-100 dark:border-white/10">
                                    <button
                                        onClick={handleCreate}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-500/10 text-green-600 font-medium flex items-center gap-2"
                                    >
                                        <Plus size={16} /> Add "{inputValue}"
                                    </button>
                                </div>
                            )}

                            {!showCreateOption && filteredOptions.length === 0 && (
                                <div className="p-3 text-center text-xs text-slate-400 italic">No options found.</div>
                            )}
                        </div>
                    </GlassCard>
                </div>
            )}
        </div>
    );
};

export default SmartSelect;
