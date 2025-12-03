import React from 'react';
import { Autocomplete, TextField, Chip, Box } from '@mui/material';
import { Slice } from '../../modeling';

interface SliceFilterProps {
    slices: Slice[];
    selectedSliceIds: string[];
    onChange: (selectedIds: string[]) => void;
}

const SliceFilter: React.FC<SliceFilterProps> = ({ slices, selectedSliceIds, onChange }) => {
    const selectedSlices = slices.filter(s => selectedSliceIds.includes(s.id));

    return (
        <Box
            sx={{
                position: 'absolute',
                top: 80,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 10,
                width: 400,
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 2,
                boxShadow: 3,
                backdropFilter: 'blur(4px)',
            }}
        >
            <Autocomplete
                multiple
                id="slice-filter"
                options={slices}
                getOptionLabel={(option) => option.title || 'Untitled'}
                value={selectedSlices}
                onChange={(_, newValue) => {
                    onChange(newValue.map(s => s.id));
                }}
                renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                        <Chip
                            variant="outlined"
                            label={option.title}
                            size="small"
                            {...getTagProps({ index })}
                            key={option.id}
                        />
                    ))
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        variant="outlined"
                        placeholder={selectedSlices.length === 0 ? "Filter by Slice..." : ""}
                        size="small"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { border: 'none' },
                            },
                        }}
                    />
                )}
                sx={{
                    '& .MuiAutocomplete-tag': {
                        margin: 0.5,
                    },
                }}
            />
        </Box>
    );
};

export default SliceFilter;
