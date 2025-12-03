import React, { useEffect } from 'react';
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

    return (
        <Drawer
            anchor="right"
            variant="persistent"
            open={isOpen}
            sx={{
                width: 384,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 384,
                    boxSizing: 'border-box',
                    boxShadow: theme.shadows[4],
                    borderLeft: `1px solid ${theme.palette.divider}`
                },
            }}
        >
            <FocusTrap
                open={isOpen}
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', outline: 'none' }} tabIndex={-1}>
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
