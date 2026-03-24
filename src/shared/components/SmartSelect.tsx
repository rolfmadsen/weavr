"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"

interface Option {
    id: string;
    label: string;
    subLabel?: string;
    group?: string;
    color?: string;
    originalData?: any;
}

interface SmartSelectProps {
    options: Option[];
    value: string;
    onChange: (id: string, option?: Option) => void;
    onCreate?: (inputValue: string) => string | void;
    placeholder?: string;
    allowCustomValue?: boolean;
    onSearchChange?: (value: string) => void;
    className?: string;
    disabled?: boolean;
    autoFocus?: boolean;
    align?: "start" | "center" | "end";
    dropdownWidth?: string;
    [key: string]: any;
}

const SmartSelect = React.forwardRef<HTMLButtonElement, SmartSelectProps>(({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    allowCustomValue = false,
    onSearchChange,
    className,
    disabled,
    autoFocus,
    align = "start",
    dropdownWidth,
    ...props
}, ref) => {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const selectedOption = React.useMemo(() => 
        options.find((opt: Option) => opt.id === value),
        [options, value]
    )

    // Manual filtering to avoid cmdk flickering while shouldFilter={false}
    const filteredOptions = React.useMemo(() => {
        if (!search.trim()) return options;
        const lowSearch = search.toLowerCase().trim();
        return options.filter((opt: Option) => 
            opt.label.toLowerCase().includes(lowSearch) || 
            (opt.subLabel && opt.subLabel.toLowerCase().includes(lowSearch)) ||
            (opt.group && opt.group.toLowerCase().includes(lowSearch))
        );
    }, [options, search]);

    const groupedOptions = React.useMemo(() => {
        const groups: Record<string, Option[]> = {}
        filteredOptions.forEach((opt: Option) => {
            const group = opt.group || 'Other'
            if (!groups[group]) groups[group] = []
            groups[group].push(opt)
        });
        return groups
    }, [filteredOptions])

    const showCreateOption = React.useMemo(() => {
        return search.trim() &&
            !options.some((o: Option) => o.label.toLowerCase() === search.toLowerCase().trim()) &&
            (onCreate || allowCustomValue);
    }, [search, options, onCreate, allowCustomValue]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
                render={
                    <Button
                        ref={ref}
                        variant="glass"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        autoFocus={autoFocus}
                        {...props}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setOpen(true);
                            }
                        }}
                        className={cn(
                            "w-full justify-between font-normal glass-input h-10 px-4 py-2",
                            !value && "text-muted-foreground",
                            className
                        )}
                    >
                        <span className="truncate">
                            {selectedOption ? selectedOption.label : placeholder || "Select..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                }
            />
            <PopoverContent 
                className="p-0 glass-card border-none ring-0 shadow-2xl z-[200]" 
                align={align} 
                sideOffset={8}
                style={{ width: dropdownWidth || 'var(--anchor-width)' }}
            >
                <Command shouldFilter={false} className="bg-transparent">
                    <CommandInput 
                        placeholder={placeholder || "Search..."} 
                        value={search}
                        onValueChange={(val: string) => {
                            setSearch(val);
                            onSearchChange?.(val);
                        }}
                    />
                    <CommandList className="custom-scrollbar max-h-60 overflow-y-auto">
                        {filteredOptions.length === 0 && !showCreateOption && (
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground italic">
                                {search.trim() ? "No results found." : "Type to create or search..."}
                            </CommandEmpty>
                        )}
                        
                        {Object.entries(groupedOptions).map(([group, opts]) => (
                            <CommandGroup key={group} heading={Object.keys(groupedOptions).length > 1 ? group : undefined}>
                                {opts.map((opt) => (
                                    <CommandItem
                                        key={opt.id}
                                        value={opt.id}
                                        onSelect={() => {
                                            onChange(opt.id, opt)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className="flex-col items-start gap-0 px-3 py-2 cursor-pointer aria-selected:bg-gray-100 dark:aria-selected:bg-neutral-800 data-[selected=true]:bg-gray-100 dark:data-[selected=true]:bg-neutral-800"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                {opt.color && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
                                                <span className="font-medium">{opt.label}</span>
                                            </div>
                                            {value === opt.id && <Check className="h-4 w-4 text-primary" />}
                                        </div>
                                        {opt.subLabel && <span className="text-[10px] text-muted-foreground">{opt.subLabel}</span>}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                        
                        {showCreateOption && (
                            <>
                                <CommandSeparator />
                                <CommandGroup>
                                    <CommandItem
                                        value={`--create--${search}`}
                                        onSelect={() => {
                                            if (onCreate) {
                                                const id = onCreate(search)
                                                if (id) onChange(id, { id, label: search })
                                            } else if (allowCustomValue) {
                                                onChange(search)
                                            }
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className="text-primary font-semibold cursor-pointer py-3"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add "{search}"
                                    </CommandItem>
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
})

SmartSelect.displayName = "SmartSelect"

export default SmartSelect
