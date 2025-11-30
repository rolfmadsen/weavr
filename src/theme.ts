import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#6750A4', // MD3 Purple
            light: '#EADDFF',
            dark: '#21005D',
            contrastText: '#FFFFFF',
        },
        secondary: {
            main: '#625B71',
            light: '#E8DEF8',
            dark: '#1D192B',
            contrastText: '#FFFFFF',
        },
        error: {
            main: '#B3261E',
            light: '#F9DEDC',
            dark: '#410E0B',
            contrastText: '#FFFFFF',
        },
        background: {
            default: '#FFFBFE', // Surface
            paper: '#F7F2FA',   // Surface Variant
        },
        text: {
            primary: '#1C1B1F',
            secondary: '#49454F',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h6: {
            fontWeight: 500,
        },
        button: {
            textTransform: 'none', // MD3 buttons are not uppercase by default
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 12, // MD3 uses more rounded corners
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 20, // Pill shape for buttons
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none', // Remove default gradient overlay in dark mode if we switch
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#F7F2FA', // Surface color for app bar
                    color: '#1C1B1F',
                    boxShadow: 'none',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#F7F2FA',
                    borderTopLeftRadius: 16,
                    borderBottomLeftRadius: 16,
                },
            },
        },
    },
});

export default theme;
