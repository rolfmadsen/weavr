import React, { useMemo } from 'react';
import { CircleHelp } from 'lucide-react';
import { GlassTooltip } from './GlassTooltip';
import { cn } from '../lib/utils';
import { Label } from './ui/label';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
} from './ui/select';

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
        <div className={cn("w-full", className)}>
            {label && (
                <Label className="mb-2 flex items-center gap-1 ml-1 text-slate-700 dark:text-slate-300">
                    {label}
                    {labelTooltip && (
                        <GlassTooltip content={labelTooltip}>
                            <CircleHelp size={14} className="text-slate-400" />
                        </GlassTooltip>
                    )}
                </Label>
            )}

            <Select value={value} onValueChange={(val) => val && onChange(val)} disabled={disabled}>
                <SelectTrigger className={cn("glass-input w-full py-2.5 px-4 h-auto focus:ring-2 focus:ring-primary/50", buttonClassName)}>
                    <div className="flex items-center gap-2 truncate">
                        {(() => {
                            const selectedOption = options.find(opt => opt.id === value);
                            if (selectedOption) {
                                return (
                                    <>
                                        {selectedOption.icon}
                                        <span className="truncate">{selectedOption.label}</span>
                                    </>
                                );
                            }
                            return <SelectValue />;
                        })()}
                    </div>
                </SelectTrigger>
                <SelectContent className="glass-card border-none shadow-2xl min-w-[200px]">
                    {Object.entries(groupedOptions).map(([group, opts], idx, arr) => (
                        <SelectGroup key={group}>
                            {group !== 'default' && (
                                <SelectLabel className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest dark:text-slate-500">
                                    {group}
                                </SelectLabel>
                            )}
                            {opts.map((option) => (
                                <SelectItem key={option.id} value={option.id} className="hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                                    <span className="flex items-center gap-2">
                                        {option.icon}
                                        {option.label}
                                    </span>
                                </SelectItem>
                            ))}
                            {idx < arr.length - 1 && <SelectSeparator className="bg-white/10" />}
                        </SelectGroup>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};
