import React, { useState, useMemo } from 'react';
import { Box, TextField, Typography, IconButton, Tooltip, Stack, Avatar } from '@mui/material';
import { Node } from '../../modeling';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    CenterFocusStrong as FocusIcon,
} from '@mui/icons-material';
import { ELEMENT_STYLE } from '../../../shared/constants';

interface ElementFilterProps {
    nodes: Node[];
    onNodeClick: (node: Node) => void;
}

const ElementFilter: React.FC<ElementFilterProps> = ({ nodes, onNodeClick }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Fuzzy search nodes based on name and type
    const displayedNodes = useMemo(() => {
        if (!searchTerm.trim()) return [];

        const lower = searchTerm.toLowerCase();
        return nodes.filter(n =>
            (n.name || '').toLowerCase().includes(lower) ||
            (n.type || '').toLowerCase().includes(lower)
        ).slice(0, 20); // Limit results for performance
    }, [nodes, searchTerm]);

    const listRef = React.useRef<HTMLDivElement>(null);

    // Reset selection when search results change
    React.useEffect(() => {
        setSelectedIndex(0);
    }, [displayedNodes.length]);

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

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (displayedNodes.length === 0) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % displayedNodes.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + displayedNodes.length) % displayedNodes.length);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (selectedIndex >= 0 && selectedIndex < displayedNodes.length) {
                onNodeClick(displayedNodes[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            setSearchTerm('');
            setIsCollapsed(true);
        }
    };


    if (isCollapsed) {
        return (
            <Tooltip title="Find Element" placement="left">
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
                        mb: 1.5, // Added margin for stacking
                        '&:hover': {
                            transform: 'scale(1.1)',
                            borderColor: '#818cf8',
                            color: '#4f46e5'
                        }
                    }}
                >
                    <SearchIcon fontSize="small" color="action" />
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box
            sx={{
                width: 250,
                maxHeight: 500,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                overflow: 'hidden',
                transition: 'all 0.2s',
                mb: 1.5 // Added margin for stacking
            }}
        >
            {/* Header / Search */}
            <Box sx={{ p: 1.5, borderBottom: '1px solid #f3f4f6', bgcolor: 'rgba(249, 250, 251, 0.5)' }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600, color: '#374151', fontSize: '0.85rem' }}>
                        Filter Elements
                    </Typography>
                    <IconButton size="small" onClick={() => setIsCollapsed(true)} sx={{ p: 0.5, color: '#9ca3af' }} aria-label="Close filter">
                        <ClearIcon fontSize="small" sx={{ fontSize: 16 }} />
                    </IconButton>
                </Stack>
                <TextField
                    placeholder="Search elements..."
                    variant="outlined"
                    size="small"
                    fullWidth
                    autoFocus
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


            {/* List */}
            <Box
                ref={listRef}
                sx={{
                    overflowY: 'auto',
                    flex: 1,
                    maxHeight: 350,
                    position: 'relative',
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: '#d1d5db', borderRadius: 2 }
                }}
            >
                {searchTerm && displayedNodes.length === 0 ? (
                    <Typography variant="caption" sx={{ display: 'block', p: 2, textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
                        No elements found
                    </Typography>
                ) : (
                    displayedNodes.map((node, index) => {
                        const style = ELEMENT_STYLE[node.type as keyof typeof ELEMENT_STYLE];
                        const isHighlighted = index === selectedIndex;
                        return (
                            <Box
                                key={node.id}
                                onClick={() => onNodeClick(node)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 1.5,
                                    py: 1,
                                    cursor: 'pointer',
                                    transition: 'colors 0.1s',
                                    bgcolor: isHighlighted ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                    '&:hover': { bgcolor: isHighlighted ? 'rgba(99, 102, 241, 0.12)' : '#f3f4f6' },
                                }}
                            >
                                <Avatar
                                    sx={{
                                        width: 24,
                                        height: 24,
                                        bgcolor: style?.color || '#9ca3af',
                                        fontSize: '0.6rem',
                                        mr: 1.5
                                    }}
                                >
                                    {node.type?.charAt(0).toUpperCase()}
                                </Avatar>
                                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontSize: '0.8rem',
                                            color: '#111827',
                                            fontWeight: isHighlighted ? 600 : 500,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {node.name || 'Untitled'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                                        {node.type?.replace(/_/g, ' ')}
                                    </Typography>
                                </Box>
                                <FocusIcon sx={{ fontSize: 16, color: isHighlighted ? '#4f46e5' : '#9ca3af', ml: 1 }} />
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};


export default ElementFilter;
