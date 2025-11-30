import React, { useState, useMemo } from 'react';
import {
    Autocomplete,
    TextField,
    createFilterOptions,
    Box,
    Typography,
    FilterOptionsState
} from '@mui/material';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
    group?: string;
    color?: string;
    [key: string]: any;
}

interface SmartSelectProps {
    options: Option[];
    value: string;
    onChange: (id: string, option?: Option) => void;
    onCreate?: (inputValue: string) => string | void;
    placeholder?: string;
    allowCustomValue?: boolean;
    onSearchChange?: (value: string) => void;
    focusTrigger?: number;
}

const filter = createFilterOptions<Option>();

const SmartSelect: React.FC<SmartSelectProps> = ({
    options,
    value,
    onChange,
    onCreate,
    placeholder,
    allowCustomValue = false,
    onSearchChange,
    focusTrigger
}) => {
    const [inputValue, setInputValue] = useState('');

    // Find the selected option object based on the ID value
    const selectedOption = useMemo(() => {
        return options.find(o => o.id === value) || (allowCustomValue && value ? { id: value, label: value } : null);
    }, [options, value, allowCustomValue]);

    // Handle focus trigger from parent
    const inputRef = React.useRef<HTMLInputElement>(null);
    React.useEffect(() => {
        if (focusTrigger && focusTrigger > 0) {
            inputRef.current?.focus();
        }
    }, [focusTrigger]);

    return (
        <Autocomplete
            value={selectedOption}
            onChange={(_event, newValue) => {
                if (typeof newValue === 'string') {
                    // User typed a custom value and pressed Enter (if freeSolo is true)
                    // or selected a "Add 'xxx'" option
                    if (onCreate) {
                        const id = onCreate(newValue);
                        if (id) onChange(id);
                        else if (allowCustomValue) onChange(newValue);
                    } else if (allowCustomValue) {
                        onChange(newValue);
                    }
                } else if (newValue && (newValue as any).inputValue) {
                    // User selected "Add 'xxx'" option created by filterOptions
                    if (onCreate) {
                        const id = onCreate((newValue as any).inputValue);
                        if (id) onChange(id);
                    }
                } else if (newValue) {
                    // User selected a regular option
                    onChange((newValue as Option).id, newValue as Option);
                } else {
                    // User cleared the selection
                    onChange('');
                }
            }}
            filterOptions={(options: Option[], params: FilterOptionsState<Option>) => {
                const filtered = filter(options, params);

                const { inputValue } = params;
                // Suggest the creation of a new value
                const isExisting = options.some((option) => inputValue === option.label);
                if (inputValue !== '' && !isExisting && onCreate) {
                    filtered.push({
                        inputValue,
                        label: `Add "${inputValue}"`,
                        id: 'create-option-id', // Dummy ID
                        group: 'Actions'
                    } as any);
                }

                return filtered;
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            id="smart-select"
            options={options}
            getOptionLabel={(option) => {
                // Value selected with enter, right from the input
                if (typeof option === 'string') {
                    return option;
                }
                // Add "xxx" option created dynamically
                if ((option as any).inputValue) {
                    return (option as any).inputValue;
                }
                // Regular option
                return option.label;
            }}
            renderOption={(props, option) => {
                const { key, ...otherProps } = props;
                return (
                    <li key={key} {...otherProps}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body1">
                                    {option.label}
                                </Typography>
                                {option.color && (
                                    <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: option.color, ml: 1 }} />
                                )}
                            </Box>
                            {option.subLabel && (
                                <Typography variant="caption" color="text.secondary">
                                    {option.subLabel}
                                </Typography>
                            )}
                        </Box>
                    </li>
                );
            }}
            groupBy={(option) => (typeof option === 'string' ? '' : option.group || '')}
            freeSolo={allowCustomValue}
            inputValue={inputValue}
            onInputChange={(_event, newInputValue) => {
                setInputValue(newInputValue);
                onSearchChange?.(newInputValue);
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    inputRef={inputRef}
                    placeholder={placeholder}
                    size="small"
                    fullWidth
                />
            )}
            size="small"
            fullWidth
        />
    );
};

export default SmartSelect;
