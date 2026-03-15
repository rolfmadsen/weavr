import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

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

const SmartSelect = React.forwardRef<HTMLInputElement, SmartSelectProps>(({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    allowCustomValue = false,
    onSearchChange,
    autoFocus
}, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
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
            const trimmedInput = inputValue.trim();
            const highlightedOption = filteredOptions.find(o => o.label.toLowerCase() === trimmedInput.toLowerCase());
            if (highlightedOption) {
                handleSelect(highlightedOption);
            } else if (showCreateOption) {
                handleCreate();
            } else if (!trimmedInput) {
                // Clear on Enter if empty
                const noneOption = options.find(o => o.id === '__none__');
                if (noneOption) handleSelect(noneOption);
                else onChange('', undefined);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    // Sync internal input value with selected external value ID
    useEffect(() => {
        // We only sync if the value prop has actually changed 
        // OR if the menu is NOT open and the input doesn't match the expected label
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

    // Handle outside click to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const trimmedInput = inputValue.trim();
                const shouldCommit = trimmedInput && 
                    (filteredOptions.some(o => o.label.toLowerCase() === trimmedInput.toLowerCase()) || showCreateOption);
                
                // If input is explicitly cleared by the user, we should deselect
                const isCleared = !trimmedInput && value !== '__none__' && value !== '';

                if (isOpen) {
                    if (shouldCommit) {
                        const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === trimmedInput.toLowerCase());
                        if (exactMatch) handleSelect(exactMatch);
                        else if (showCreateOption) handleCreate();
                    } else if (isCleared) {
                        // Support both __none__ and empty string as "nothing"
                        const noneOption = options.find(o => o.id === '__none__');
                        if (noneOption) {
                            handleSelect(noneOption);
                        } else {
                            onChange('', undefined);
                        }
                    }
                }

                setIsOpen(false);
                // Reset input to current value on blur ONLY if we didn't commit/clear
                if (!shouldCommit && !isCleared) {
                    const selected = options.find(o => o.id === value);
                    if (selected) setInputValue(selected.label);
                    else if (allowCustomValue && value) setInputValue(value);
                    else if (value === '__none__') setInputValue('');
                    else setInputValue('');
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options, allowCustomValue, inputValue, isOpen, filteredOptions, showCreateOption]);


    return (
        <div className="relative w-full" ref={containerRef}>
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
                    placeholder={placeholder}
                    autoFocus={autoFocus}
                    autoComplete="off"
                    className="py-3 px-4 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                />
                <button 
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="absolute inset-y-0 end-0 flex items-center z-20 px-3 cursor-pointer text-gray-400 hover:text-blue-600 focus:outline-none focus:text-blue-600 dark:text-neutral-500 dark:hover:text-blue-500 dark:focus:text-blue-500"
                >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white border border-gray-200 shadow-sm rounded-xl dark:bg-neutral-900 dark:border-neutral-700 dark:shadow-neutral-700/70 p-1 origin-top">
                        <div ref={listRef} className="max-h-60 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-track]:bg-neutral-700 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500">
                        {Object.entries(groupedOptions).map(([group, opts]) => (
                            <div key={group}>
                                {Object.keys(groupedOptions).length > 1 && (
                                    <div className="px-3 py-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-neutral-400">{group}</div>
                                )}
                                {opts.map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className="w-full text-left py-2 px-3 rounded-lg flex flex-col group hover:bg-gray-100 focus:outline-none focus:bg-gray-100 dark:hover:bg-neutral-800 dark:focus:bg-neutral-800 transition-colors"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-800 dark:text-neutral-200">{opt.label}</span>
                                            {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                                        </div>
                                        {opt.subLabel && <span className="text-xs text-gray-500 dark:text-neutral-500">{opt.subLabel}</span>}
                                    </button>
                                ))}
                            </div>
                        ))}

                        {showCreateOption && (
                            <div className="pt-1 mt-1 border-t border-gray-200 dark:border-neutral-700">
                                <button
                                    type="button"
                                    onClick={handleCreate}
                                    className="w-full text-left py-2 px-4 rounded-lg flex items-center gap-2 text-sm text-blue-600 font-medium hover:bg-blue-50 focus:outline-none focus:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-800/30 dark:focus:bg-blue-800/30 transition-colors"
                                >
                                    <Plus size={16} /> Add "{inputValue}"
                                </button>
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
