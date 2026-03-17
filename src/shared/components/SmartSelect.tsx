import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Option {
    id: string;
    label: string;
    subLabel?: string;
    group?: string;
    color?: string;
    inputValue?: string;
}

interface SmartSelectProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    options: Option[];
    value: string;
    onChange: (id: string, option?: Option) => void;
    onCreate?: (inputValue: string) => string | void;
    placeholder?: string;
    allowCustomValue?: boolean;
    onSearchChange?: (value: string) => void;
}

const SmartSelect = React.forwardRef<HTMLInputElement, SmartSelectProps>(({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    allowCustomValue = false,
    onSearchChange,
    className,
    ...props
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const lastValueRef = useRef(value);

    const filteredOptions = useMemo(() => {
        if (!inputValue.trim()) return options;

        const selected = options.find(o => o.id === value);
        // If the user just focused and hasn't changed the input, show all options
        if (selected && inputValue === selected.label) {
            return options;
        }

        const lowerInput = inputValue.toLowerCase();
        let filtered = options.filter(o =>
            o.label.toLowerCase().includes(lowerInput) ||
            (o.subLabel && o.subLabel.toLowerCase().includes(lowerInput))
        );
        return filtered;
    }, [options, inputValue, value]);

    const showCreateOption = useMemo(() => {
        return inputValue.trim() &&
            !filteredOptions.some(o => o.label.toLowerCase() === inputValue.toLowerCase().trim()) &&
            (onCreate || allowCustomValue);
    }, [inputValue, filteredOptions, onCreate, allowCustomValue]);

    // Construct a flat list of items that are actually rendered and navigable via arrows
    const navigableItems = useMemo(() => {
        const items = [...filteredOptions];
        if (showCreateOption) {
            items.push({ id: '__create__', label: `Add "${inputValue}"` });
        }
        return items;
    }, [filteredOptions, showCreateOption, inputValue]);

    const groupedOptions = useMemo(() => {
        const groups: Record<string, Option[]> = {};
        filteredOptions.forEach(opt => {
            const group = opt.group || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(opt);
        });
        return groups;
    }, [filteredOptions]);

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (isOpen && highlightedIndex >= 0 && highlightedIndex < navigableItems.length) {
                const highlighted = navigableItems[highlightedIndex];
                if (highlighted.id === '__create__') {
                    handleCreate();
                } else {
                    handleSelect(highlighted);
                }
                e.preventDefault();
            } else {
                const trimmedInput = inputValue.trim();
                const highlightedOption = filteredOptions.find(o => o.label.toLowerCase() === trimmedInput.toLowerCase());
                if (highlightedOption) {
                    handleSelect(highlightedOption);
                } else if (showCreateOption) {
                    handleCreate();
                } else if (!trimmedInput) {
                    const noneOption = options.find(o => o.id === '__none__');
                    if (noneOption) handleSelect(noneOption);
                    else onChange('', undefined);
                }
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) setIsOpen(true);
            setHighlightedIndex(prev => (prev < navigableItems.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Auto-scroll highlighted item into view
    useEffect(() => {
        if (isOpen && highlightedIndex >= 0 && listRef.current) {
            const list = listRef.current;
            const buttons = list.querySelectorAll('button');
            const highlightedButton = buttons[highlightedIndex];
            if (highlightedButton) {
                highlightedButton.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    // Reset highlighted index when menu opens or filter changes
    useEffect(() => {
        if (isOpen) {
            setHighlightedIndex(-1);
        }
    }, [isOpen, filteredOptions, showCreateOption]);

    // Sync internal input value with selected external value ID
    useEffect(() => {
        const selected = options.find(o => o.id === value);
        const expectedLabel = selected?.label || (allowCustomValue && value ? value : '');
        
        const hasValueChanged = value !== lastValueRef.current;
        
        if (hasValueChanged || (!isOpen && inputValue !== expectedLabel)) {
            if (selected) {
                setInputValue(selected.label);
            } else if (allowCustomValue && value) {
                setInputValue(value);
            } else if (!value || value === '__none__') {
                setInputValue('');
            }
            lastValueRef.current = value;
        }
    }, [value, isOpen, options, allowCustomValue, inputValue]);

    const handleExit = (event?: MouseEvent | React.FocusEvent) => {
        if (event && 'relatedTarget' in event) {
            const nextFocus = event.relatedTarget as Node;
            if (containerRef.current?.contains(nextFocus)) {
                return;
            }
        }

        const trimmedInput = inputValue.trim();
        const shouldCommit = trimmedInput && 
            (filteredOptions.some(o => o.label.toLowerCase() === trimmedInput.toLowerCase()) || showCreateOption);
        
        const isCleared = !trimmedInput && value !== '__none__' && value !== '';

        if (isOpen) {
            if (shouldCommit) {
                const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === trimmedInput.toLowerCase());
                if (exactMatch) handleSelect(exactMatch);
                else if (showCreateOption) handleCreate();
            } else if (isCleared) {
                const noneOption = options.find(o => o.id === '__none__');
                if (noneOption) handleSelect(noneOption);
                else onChange('', undefined);
            }
        }

        setIsOpen(false);
        if (!shouldCommit && !isCleared) {
            const selected = options.find(o => o.id === value);
            if (selected) setInputValue(selected.label);
            else if (allowCustomValue && value) setInputValue(value);
            else setInputValue('');
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                handleExit();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleExit]);


    return (
        <div 
            className="relative w-full" 
            ref={containerRef}
            onBlur={handleExit}
        >
            <div className="relative">
                <input
                    ref={ref}
                    type="text"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        onSearchChange?.(e.target.value);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    {...props}
                    placeholder={placeholder}
                    autoComplete="off"
                    className={cn(
                        "py-3 px-4 block w-full border-gray-200 shadow-sm rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600",
                        className
                    )}
                />
                <button 
                    type="button"
                    tabIndex={-1}
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute inset-y-0 end-0 flex items-center z-20 px-3 cursor-pointer text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 dark:text-neutral-500 dark:hover:text-blue-500 dark:focus:text-blue-500"
                >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-lg dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-1 origin-top">
                        <div 
                            ref={listRef} 
                            tabIndex={-1}
                            className="max-h-60 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
                        >
                        {Object.entries(groupedOptions).map(([group, opts]) => (
                            <div key={group}>
                                {Object.keys(groupedOptions).length > 1 && (
                                    <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-neutral-400">{group}</div>
                                )}
                                {opts.map(opt => {
                                    const index = navigableItems.findIndex(i => i.id === opt.id);
                                    const isHighlighted = index === highlightedIndex;
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            tabIndex={-1}
                                            onClick={() => handleSelect(opt)}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn(
                                                "w-full text-left py-2 px-3 rounded-lg flex flex-col focus:outline-none transition-colors",
                                                isHighlighted ? "bg-gray-100 dark:bg-neutral-800" : "hover:bg-gray-50 dark:hover:bg-neutral-800/50"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-800 dark:text-neutral-200">{opt.label}</span>
                                                {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                                            </div>
                                            {opt.subLabel && <span className="text-xs text-gray-500 dark:text-neutral-500">{opt.subLabel}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                        {showCreateOption && (
                            <div className="pt-1 mt-1 border-t border-gray-200 dark:border-neutral-700">
                                {(() => {
                                    const index = navigableItems.length - 1;
                                    const isHighlighted = index === highlightedIndex;
                                    return (
                                        <button
                                            type="button"
                                            tabIndex={-1}
                                            onClick={handleCreate}
                                            onMouseEnter={() => setHighlightedIndex(index)}
                                            className={cn(
                                                "w-full text-left py-2 px-4 rounded-lg flex items-center gap-2 text-sm text-blue-600 font-medium focus:outline-none transition-colors",
                                                isHighlighted ? "bg-blue-50 dark:bg-blue-800/20" : "hover:bg-blue-50 dark:hover:bg-blue-800/20"
                                            )}
                                        >
                                            <Plus size={16} /> Add "{inputValue}"
                                        </button>
                                    );
                                })()}
                            </div>
                        )}

                        {!showCreateOption && filteredOptions.length === 0 && (
                            <div className="p-3 text-center text-sm text-gray-500 italic dark:text-neutral-500">No options found.</div>
                        )}
                    </div>
                </div>
            </div>
            )}
        </div>
    );
});

export default SmartSelect;
