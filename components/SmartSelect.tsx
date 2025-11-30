import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon } from './icons';

export interface SmartSelectOption {
    id: string;
    label: string;
    color?: string;
    subLabel?: string; // For showing "From Model X"
    group?: string;    // For grouping in the UI
}

export interface SmartSelectProps {
    options: SmartSelectOption[];
    value: string | undefined;
    onChange: (id: string, option?: SmartSelectOption) => void;
    onCreate?: (title: string) => string | void;
    placeholder?: string;
    autoFocus?: boolean;
    allowCustomValue?: boolean;
    onSearchChange?: (value: string) => void;
    focusTrigger?: number;
}

const SmartSelect: React.FC<SmartSelectProps> = ({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    autoFocus,
    allowCustomValue,
    onSearchChange,
    focusTrigger
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(option => option.id === value);

    // Sync search with selected option when closed
    useEffect(() => {
        if (!isOpen) {
            setSearch(selectedOption?.label || (allowCustomValue && value ? value : '') || '');
        }
    }, [isOpen, selectedOption, value, allowCustomValue]);

    // Auto-focus if requested
    useEffect(() => {
        if ((autoFocus || focusTrigger) && inputRef.current) {
            inputRef.current.focus();
        }
    }, [autoFocus, focusTrigger]);

    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (option: SmartSelectOption) => {
        onChange(option.id, option);
        setSearch(option.label);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleCreate = () => {
        if (onCreate && search.trim()) {
            const newId = onCreate(search.trim());
            if (newId) {
                // If onCreate returns an ID, use it. 
                // Otherwise, we assume the parent handles the update via props/re-render.
                onChange(newId);
            }
            setIsOpen(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else {
                setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (isOpen) {
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (!isOpen) {
                setIsOpen(true);
            } else if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
                handleSelect(filteredOptions[selectedIndex]);
            } else if (filteredOptions.length > 0 && !onCreate) {
                // Auto-select top result if nothing explicitly selected and creation is disabled
                handleSelect(filteredOptions[0]);
            } else if (search.trim() && onCreate) {
                // If creation is enabled, prefer creation or explicit selection?
                // Usually, if there's an exact match, we might want to select it.
                // But for now, let's stick to: if selectedIndex is -1, try create.
                const exactMatch = filteredOptions.find(o => o.label.toLowerCase() === search.trim().toLowerCase());
                if (exactMatch) {
                    handleSelect(exactMatch);
                } else {
                    handleCreate();
                }
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setSearch(selectedOption?.label || (allowCustomValue && value ? value : '') || '');
            inputRef.current?.blur();
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                    placeholder={placeholder || 'Select...'}
                    value={isOpen ? search : (selectedOption?.label || (allowCustomValue && value ? value : '') || '')}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (onSearchChange) onSearchChange(e.target.value);
                        if (!isOpen) setIsOpen(true);
                        setSelectedIndex(-1);
                    }}
                    onFocus={(e) => {
                        e.target.select();
                        if (!isOpen) setIsOpen(true);
                    }}
                    onClick={() => {
                        if (!isOpen) setIsOpen(true);
                    }}
                    onKeyDown={(e) => {
                        if (!e.altKey && e.key !== 'Tab') {
                            e.stopPropagation();
                        }
                        handleKeyDown(e);
                    }}
                    onBlur={() => {
                        setIsOpen(false);
                        if (onCreate && search.trim()) {
                            onCreate(search.trim());
                        }
                    }}
                />
                <div
                    className="absolute inset-y-0 right-0 flex items-center px-2 cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur on input when clicking arrow
                    onClick={() => {
                        setIsOpen(!isOpen);
                        if (!isOpen) {
                            setSearch(''); // Clear search on arrow click to show all
                            inputRef.current?.focus();
                        }
                    }}
                >
                    <ChevronDownIcon className="text-gray-400" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                    <ul className="max-h-60 overflow-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => (
                                <li
                                    key={option.id}
                                    className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 ${index === selectedIndex ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'}`}
                                    onMouseDown={() => handleSelect(option)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <span>{option.label}</span>
                                            {option.subLabel && (
                                                <span className="text-xs text-gray-500 ml-2">{option.subLabel}</span>
                                            )}
                                        </div>
                                        {index === selectedIndex && (
                                            <span className="text-xs text-indigo-500 font-medium">
                                                {option.subLabel ? 'Enter to Import' : 'Enter to Select'}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-gray-500">No options</li>
                        )}
                        {onCreate && search.trim() && !filteredOptions.some(o => o.label.toLowerCase() === search.trim().toLowerCase()) && (
                            <li
                                className={`px-3 py-2 cursor-pointer text-indigo-600 hover:bg-indigo-50 flex items-center justify-between ${selectedIndex === filteredOptions.length ? 'bg-indigo-100' : ''}`}
                                onMouseDown={handleCreate}
                                onMouseEnter={() => setSelectedIndex(filteredOptions.length)}
                            >
                                <div className="flex items-center">
                                    <PlusIcon className="text-base mr-2" />
                                    <span>Create "{search}"</span>
                                </div>
                                {selectedIndex === filteredOptions.length && (
                                    <span className="text-xs text-indigo-500 font-medium">Enter to Create</span>
                                )}
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SmartSelect;
