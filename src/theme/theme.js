import {createTheme} from '@mui/material/styles';

// צבעים שנלקחו ישירות מ-src/styles/base.css (מסך הפתיחה)
const TEAL = '#1bbfc4';
const TEAL_DEEP = '#159aa0';
const MINT = '#bcdcd8';
const MINT_SOFT = '#dcebe9';
const CHARCOAL = '#33383a';
const INK = '#101010';
const MUTED = '#5f5f5f';

export const theme = createTheme({
    direction: 'rtl',
    palette: {
        primary: {main: TEAL, dark: TEAL_DEEP, light: MINT, contrastText: INK},
        secondary: {main: CHARCOAL},
        text: {primary: INK, secondary: MUTED},
        divider: 'rgba(0, 0, 0, 0.12)',
        background: {default: '#e8e8e8', paper: '#ffffff'},
        success: {main: TEAL_DEEP},
    },
    shape: {borderRadius: 20},
    typography: {
        fontFamily: "'Heebo', Arial, sans-serif",
        h3: {fontWeight: 300, lineHeight: 1.15},
        h4: {fontWeight: 300, lineHeight: 1.2},
        h5: {fontWeight: 500},
        button: {fontWeight: 500, letterSpacing: '0.06em', textTransform: 'none'},
    },
    components: {
        MuiTextField: {
            // שדות במסגרת מלאה, עם תווית שצפה על הקו העליון
            defaultProps: {variant: 'outlined', fullWidth: true},
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: 14,
                    backgroundColor: '#fff',
                    '& .MuiOutlinedInput-notchedOutline': {borderColor: 'rgba(0, 0, 0, 0.23)'},
                    '&:hover .MuiOutlinedInput-notchedOutline': {borderColor: TEAL_DEEP},
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {borderColor: TEAL, borderWidth: 2},
                },
            },
        },
        MuiInputLabel: {
            styleOverrides: {
                root: {'&.Mui-focused': {color: TEAL_DEEP}},
            },
        },
        MuiFormHelperText: {
            styleOverrides: {root: {marginInline: '4px'}},
        },
        MuiButton: {
            defaultProps: {disableElevation: true},
            styleOverrides: {
                root: {borderRadius: 999, padding: '0.6rem 2rem'},
                outlined: {
                    borderColor: TEAL,
                    color: INK,
                    '&:hover': {backgroundColor: TEAL, borderColor: TEAL, color: '#fff'},
                },
                contained: {'&:hover': {backgroundColor: TEAL_DEEP}},
                text: {'&:hover': {backgroundColor: 'transparent', color: TEAL_DEEP}},
            },
        },
        MuiCard: {
            defaultProps: {elevation: 0},
            styleOverrides: {
                root: {border: `1px solid ${MINT_SOFT}`, borderRadius: 20, backgroundColor: '#fff'},
            },
        },
        MuiPaper: {
            styleOverrides: {root: {backgroundImage: 'none'}},
        },
        MuiAlert: {
            styleOverrides: {root: {borderRadius: 14}},
        },
        MuiChip: {
            styleOverrides: {root: {fontWeight: 500}},
        },
    },
});
