import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    Drawer,
    Box,
    IconButton,
    Tabs,
    Tab,
    Typography,
    useTheme,
    Unstable_TrapFocus as FocusTrap
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    activeTab?: string;
    onTabChange?: (tab: string) => void;
    tabs?: { id: string; label: string; title?: string }[];
}

const MIN_WIDTH = 300;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 384;

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onClose,
    title,
    children,
    activeTab,
    onTabChange,
    tabs
}) => {
    const theme = useTheme();
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on ESC key (Drawer handles this by default for 'temporary' variant, but we use 'persistent')
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !e.defaultPrevented) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
        onTabChange?.(newValue);
    };

    const startResizing = useCallback((e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing) {
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
                setWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    return (
        <Drawer
            anchor="right"
            variant="persistent"
            open={isOpen}
            sx={{
                width: width,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: width,
                    boxSizing: 'border-box',
                    boxShadow: theme.shadows[4],
                    borderLeft: `1px solid ${theme.palette.divider}`,
                    overflow: 'visible' // Allow resize handle to be visible
                },
            }}
            ref={sidebarRef}
        >
            {/* Resize Handle */}
            <Box
                onMouseDown={startResizing}
                sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: -5,
                    width: 10,
                    cursor: 'ew-resize',
                    zIndex: 1201, // Above drawer content
                    '&:hover': {
                        background: 'rgba(0, 0, 0, 0.1)', // Visual cue
                    }
                }}
            />

            <FocusTrap
                open={isOpen}
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    {/* Header */}
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderBottom: 1,
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                    }}>
                        {tabs && tabs.length > 0 ? (
                            <Tabs
                                value={activeTab}
                                onChange={handleTabChange}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ minHeight: 48 }}
                            >
                                {tabs.map(tab => (
                                    <Tab
                                        key={tab.id}
                                        value={tab.id}
                                        label={tab.label}
                                        title={tab.title}
                                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
                                    />
                                ))}
                            </Tabs>
                        ) : (
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                {title}
                            </Typography>
                        )}
                        <IconButton onClick={onClose} size="small">
                            <CloseIcon />
                        </IconButton>
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                        {children}
                    </Box>
                </Box>
            </FocusTrap>
        </Drawer>
    );
};

export default Sidebar;
