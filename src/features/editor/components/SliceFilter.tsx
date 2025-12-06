import React, { useState, useMemo } from 'react';
import { Box, TextField, Checkbox, Typography, IconButton, Tooltip, Stack } from '@mui/material';
import { Slice } from '../../modeling';
import {
    FilterList as FilterIcon,
    Clear as ClearIcon,
    SelectAll as SelectAllIcon,
    Deselect as DeselectIcon
} from '@mui/icons-material';

interface SliceFilterProps {
    slices: Slice[];
    selectedSliceIds: string[];
    onChange: (selectedIds: string[]) => void;
}

const SliceFilter: React.FC<SliceFilterProps> = ({ slices, selectedSliceIds, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Filter slices based on search
    const displayedSlices = useMemo(() => {
        if (!searchTerm.trim()) return slices;
        const lower = searchTerm.toLowerCase();
        return slices.filter(s => (s.title || 'Untitled').toLowerCase().includes(lower));
    }, [slices, searchTerm]);

    const handleToggleSlice = (id: string) => {
        if (selectedSliceIds.includes(id)) {
            onChange(selectedSliceIds.filter(sId => sId !== id));
        } else {
            onChange([...selectedSliceIds, id]);
        }
    };

    const handleSelectAll = () => {
        // Select all currently displayed slices
        const displayedIds = displayedSlices.map(s => s.id);
        const newSelection = Array.from(new Set([...selectedSliceIds, ...displayedIds]));
        onChange(newSelection);
    };

    const handleClearSelection = () => {
        // Deselect all currently displayed slices
        const displayedIds = new Set(displayedSlices.map(s => s.id));
        const newSelection = selectedSliceIds.filter(id => !displayedIds.has(id));
        onChange(newSelection);
    };

    if (slices.length === 0) return null;

    if (isCollapsed) {
        return (
            <Tooltip title="Filter Slices" placement="right">
                <Box
                    onClick={() => setIsCollapsed(false)}
                    sx={{
                        position: 'absolute',
                        bottom: 270, // 24px (bottom-24) + 160px (height) + 86px gap/padding
                        left: 32,    // left-8
                        zIndex: 10,
                        width: 40,
                        height: 40,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '50%',
                        boxShadow: 3,
                        cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.2s',
                        '&:hover': {
                            transform: 'scale(1.1)',
                            borderColor: '#818cf8',
                            color: '#4f46e5'
                        }
                    }}
                >
                    <FilterIcon fontSize="small" color={selectedSliceIds.length > 0 ? "primary" : "action"} />
                    {selectedSliceIds.length > 0 && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: -2,
                                right: -2,
                                width: 14,
                                height: 14,
                                bgcolor: '#ef4444',
                                borderRadius: '50%',
                                border: '2px solid white',
                            }}
                        />
                    )}
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 270,
                left: 32,
                zIndex: 10,
                width: 250,
                maxHeight: 400,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                overflow: 'hidden',
                transition: 'all 0.2s',
            }}
        >
            {/* Header / Search */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #f3f4f6', bgcolor: 'rgba(249, 250, 251, 0.5)' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                        Filter Slices
                    </Typography>
                    <IconButton size="small" onClick={() => setIsCollapsed(true)} sx={{ p: 0.5, color: '#9ca3af' }}>
                        <ClearIcon fontSize="small" sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
                <TextField
                    placeholder="Search slices..."
                    variant="outlined"
                    size="small"
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            fontSize: '0.8rem',
                            '& fieldset': { borderColor: '#e5e7eb' },
                            '&:hover fieldset': { borderColor: '#d1d5db' },
                            '&.Mui-focused fieldset': { borderColor: '#818cf8', borderWidth: 1 },
                            height: 32
                        },
                        '& .MuiOutlinedInput-input': {
                            padding: '4px 8px',
                        }
                    }}
                />
            </Box>

            {/* Actions */}
            <Box sx={{ px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f3f4f6' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {selectedSliceIds.length} selected
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Select All">
                        <IconButton size="small" onClick={handleSelectAll} sx={{ p: 0.5 }}>
                            <SelectAllIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Clear Selection">
                        <IconButton size="small" onClick={handleClearSelection} sx={{ p: 0.5 }}>
                            <DeselectIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* List */}
            <Box sx={{
                overflowY: 'auto',
                flex: 1,
                maxHeight: 250,
                '&::-webkit-scrollbar': { width: 4 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: '#d1d5db', borderRadius: 2 }
            }}>
                {displayedSlices.length === 0 ? (
                    <Typography variant="caption" sx={{ display: 'block', p: 2, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                        No slices found
                    </Typography>
                ) : (
                    displayedSlices.map(slice => (
                        <Box
                            key={slice.id}
                            onClick={() => handleToggleSlice(slice.id)}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                px: 1.5,
                                py: 0.75,
                                cursor: 'pointer',
                                transition: 'colors 0.1s',
                                '&:hover': { bgcolor: '#f3f4f6' },
                                bgcolor: selectedSliceIds.includes(slice.id) ? 'rgba(99, 102, 241, 0.04)' : 'transparent'
                            }}
                        >
                            <Checkbox
                                size="small"
                                checked={selectedSliceIds.includes(slice.id)}
                                sx={{ p: 0.5, mr: 1, '&.Mui-checked': { color: slice.color || '#6366f1' } }}
                            />
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: slice.color,
                                    mr: 1.5,
                                    flexShrink: 0,
                                    boxShadow: '0 0 0 1px rgba(0,0,0,0.05)'
                                }}
                            />
                            <Typography
                                variant="body2"
                                sx={{
                                    fontSize: '0.8rem',
                                    color: selectedSliceIds.includes(slice.id) ? '#111827' : '#4b5563',
                                    fontWeight: selectedSliceIds.includes(slice.id) ? 500 : 400,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {slice.title || 'Untitled'}
                            </Typography>
                        </Box>
                    ))
                )}
            </Box>
        </Box>
    );
};

export default SliceFilter;
