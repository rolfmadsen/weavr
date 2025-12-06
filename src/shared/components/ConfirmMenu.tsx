import React from 'react';
import { Menu, Typography, Button, Box } from '@mui/material';

interface ConfirmMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    message: string;
}

const ConfirmMenu: React.FC<ConfirmMenuProps> = ({
    anchorEl,
    open,
    onClose,
    onConfirm,
    message
}) => {
    return (
        <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            PaperProps={{
                elevation: 3,
                sx: {
                    p: 1.5,
                    width: 280,
                    borderRadius: 2,
                    mt: 1
                }
            }}
        >
            <Typography variant="body2" sx={{ mb: 2, px: 0.5, lineHeight: 1.4 }}>
                {message}
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button
                    size="small"
                    variant="outlined"
                    color="inherit"
                    onClick={onClose}
                    sx={{ textTransform: 'none', color: 'text.secondary', borderColor: 'divider' }}
                >
                    Cancel
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    color="error"
                    onClick={() => {
                        onConfirm();
                        onClose();
                    }}
                    sx={{ textTransform: 'none', boxShadow: 'none' }}
                >
                    Delete
                </Button>
            </Box>
        </Menu>
    );
};

export default ConfirmMenu;
