import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { GlassTooltip } from './GlassTooltip';
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface GlassSelectOption {
    id: string;
    label: string;
    icon?: React.ReactNode;
    group?: string;
    color?: string;
}

interface GlassSelectProps {
    label?: string;
    value: string;
    options: GlassSelectOption[];
    onChange: (id: string) => void;
    className?: string;
    buttonClassName?: string;
    disabled?: boolean;
    labelTooltip?: React.ReactNode;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
    label,
    value,
    options,
    onChange,
    className,
    buttonClassName,
    disabled,
    labelTooltip
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(o => o.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
    };

    const groupedOptions = useMemo(() => {
        const groups: Record<string, GlassSelectOption[]> = {};
        options.forEach(opt => {
            const g = opt.group || 'default';
            if (!groups[g]) groups[g] = [];
            groups[g].push(opt);
        });
        return groups;
    }, [options]);

    return (
        <div className={cn("w-full", className)} ref={containerRef}>
            {label && (
                <label className="text-sm font-medium mb-2 dark:text-white flex items-center gap-1 ml-1">
                    {label}
                    {labelTooltip && (
                        <GlassTooltip content={labelTooltip}>
                            <CircleHelp size={14} className="text-gray-400" />
                        </GlassTooltip>
                    )}
                </label>
            )}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                    className={cn(
                        "flex items-center justify-between w-full py-2.5 px-4 bg-white border border-gray-200 rounded-lg text-sm transition-all duration-200 text-left",
                        disabled 
                            ? "bg-gray-100/50 dark:bg-black/40 text-gray-500 cursor-not-allowed opacity-70" 
                            : "text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:focus:ring-neutral-600",
                        buttonClassName
                    )}
                >
                    <span className="truncate flex items-center gap-2">
                        {selectedOption?.icon}
                        {selectedOption?.label}
                    </span>
                    <ChevronDown 
                        size={16} 
                        className={cn("text-gray-400 transition-transform duration-200 ml-2 shrink-0", isOpen && "rotate-180")} 
                    />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-1 z-[100] min-w-full w-max max-w-[280px] animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white border border-gray-200 shadow-xl rounded-lg dark:bg-neutral-900 dark:border-neutral-700 p-1 overflow-y-auto max-h-[300px]">
                                {Object.entries(groupedOptions).map(([group, opts]: [string, GlassSelectOption[]]) => (
                                    <div key={group}>
                                        {group !== 'default' && (
                                            <div className="px-3 py-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest dark:text-neutral-500">
                                                {group}
                                            </div>
                                        )}
                                        {opts.map((option: GlassSelectOption) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => handleSelect(option.id)}
                                                className={cn(
                                                    "w-full text-left py-2 px-3 rounded-md flex items-center gap-2 text-sm transition-colors whitespace-nowrap",
                                                    option.id === value 
                                                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
                                                        : "text-gray-800 hover:bg-gray-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                                )}
                                            >
                                                {option.icon}
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
