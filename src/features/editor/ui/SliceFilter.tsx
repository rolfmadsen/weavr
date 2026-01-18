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
    hiddenSliceIds: string[];
    onChange: (ids: string[]) => void;
}

const SliceFilter: React.FC<SliceFilterProps> = ({ slices, hiddenSliceIds, onChange }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Filter slices based on search AND sort by order
    const displayedSlices = useMemo(() => {
        let result = slices;
        if (searchTerm.trim()) {
            const lower = searchTerm.toLowerCase();
            result = slices.filter(s => (s.title || 'Untitled').toLowerCase().includes(lower));
        }
        // Explicitly sort by order
        return [...result].sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [slices, searchTerm]);

    const listRef = React.useRef<HTMLDivElement>(null);

    // Reset selection when search results change
    React.useEffect(() => {
        setSelectedIndex(0);
    }, [displayedSlices.length]);

    // Scroll highlighted item into view
    React.useEffect(() => {
        if (listRef.current && selectedIndex >= 0) {
            const container = listRef.current;
            const activeItem = container.children[selectedIndex] as HTMLElement;
            if (activeItem) {
                const containerTop = container.scrollTop;
                const containerBottom = containerTop + container.clientHeight;
                const itemTop = activeItem.offsetTop;
                const itemBottom = itemTop + activeItem.offsetHeight;

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop;
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.clientHeight;
                }
            }
        }
    }, [selectedIndex]);

    const handleToggleSlice = (id: string) => {
        if (hiddenSliceIds.includes(id)) {
            // Remove from hidden (make visible)
            onChange(hiddenSliceIds.filter(sId => sId !== id));
        } else {
            // Add to hidden (hide)
            onChange([...hiddenSliceIds, id]);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (displayedSlices.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % displayedSlices.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + displayedSlices.length) % displayedSlices.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault(); // Prevent page scroll on Space
            if (selectedIndex >= 0 && selectedIndex < displayedSlices.length) {
                handleToggleSlice(displayedSlices[selectedIndex].id);
            }
        } else if (e.key === 'Escape') {
            setSearchTerm('');
            setIsCollapsed(true);
        }
    };

    const handleShowVisible = () => {
        // Remove displayed slices from hidden list
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = hiddenSliceIds.filter(id => !displayedIds.includes(id));
        onChange(newHidden);
    };

    const handleHideVisible = () => {
        // Add displayed slices to hidden list
        const displayedIds = displayedSlices.map(s => s.id);
        const newHidden = Array.from(new Set([...hiddenSliceIds, ...displayedIds]));
        onChange(newHidden);
    };

    if (slices.length === 0) return null;

    if (isCollapsed) {
        return (
            <Tooltip title="Filter Slices" placement="left">
                <Box
                    onClick={() => setIsCollapsed(false)}
                    sx={{
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
                        mb: 1.5,
                        '&:hover': {
                            transform: 'scale(1.1)',
                            borderColor: '#818cf8',
                            color: '#4f46e5'
                        }
                    }}
                >
                    <FilterIcon fontSize="small" color={hiddenSliceIds.length > 0 ? "primary" : "action"} />
                    {hiddenSliceIds.length > 0 && (
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
                mb: 1.5
            }}
        >
            {/* Header / Search */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #f3f4f6', bgcolor: 'rgba(249, 250, 251, 0.5)' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                        Filter Slices
                    </Typography>
                    <IconButton size="small" onClick={() => setIsCollapsed(true)} sx={{ p: 0.5, color: '#9ca3af' }} aria-label="Close filter">
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
                    onKeyDown={handleKeyDown}
                    InputProps={{
                        endAdornment: searchTerm && (
                            <IconButton
                                size="small"
                                onClick={() => setSearchTerm('')}
                                sx={{ p: 0.5, mr: -0.5, color: '#9ca3af' }}
                            >
                                <ClearIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                        )
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            fontSize: '0.8rem',
                            '& fieldset': { borderColor: '#e5e7eb' },
                            '&:hover fieldset': { borderColor: '#d1d5db' },
                            '&.Mui-focused fieldset': { borderColor: '#818cf8', borderWidth: 1 },
                            height: 32,
                            pr: 0.5
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
                    {slices.length - hiddenSliceIds.length} slice(s) visible
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Show Visible">
                        <IconButton size="small" onClick={handleShowVisible} sx={{ p: 0.5 }}>
                            <SelectAllIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Hide Visible">
                        <IconButton size="small" onClick={handleHideVisible} sx={{ p: 0.5 }}>
                            <DeselectIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* List */}
            <Box
                ref={listRef}
                sx={{
                    overflowY: 'auto',
                    flex: 1,
                    maxHeight: 250,
                    position: 'relative',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: '#d1d5db', borderRadius: 2 }
                }}
            >
                {displayedSlices.length === 0 ? (
                    <Typography variant="caption" sx={{ display: 'block', p: 2, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                        No slices found
                    </Typography>
                ) : (
                    displayedSlices.map((slice, index) => {
                        const isHighlighted = index === selectedIndex;
                        const isVisible = !hiddenSliceIds.includes(slice.id);
                        return (
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
                                    bgcolor: isHighlighted ? 'rgba(99, 102, 241, 0.08)' : (isVisible ? 'transparent' : 'rgba(0,0,0,0.02)'),
                                    '&:hover': { bgcolor: isHighlighted ? 'rgba(99, 102, 241, 0.12)' : '#f3f4f6' },
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={isVisible}
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
                                        color: isVisible ? '#111827' : '#9ca3af',
                                        fontWeight: isHighlighted ? 600 : (isVisible ? 500 : 400),
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {slice.title || 'Untitled'}
                                </Typography>
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};

export default SliceFilter;
