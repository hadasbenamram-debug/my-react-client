import type {ReactNode} from 'react';
import {CacheProvider} from '@emotion/react';
import createCache from '@emotion/cache';
import {prefixer} from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import {ThemeProvider} from '@mui/material/styles';
import {theme} from './theme';

// cache שהופך את כל העיצוב של MUI לימין-לשמאל
const rtlCache = createCache({key: 'muirtl', stylisPlugins: [prefixer, rtlPlugin]});

interface AppThemeProviderProps {
    children: ReactNode;
}

export default function AppThemeProvider({children}: AppThemeProviderProps) {
    // בכוונה בלי CssBaseline - כדי לא לדרוס את הרקע הפסים והעיצוב של מסך הפתיחה
    return (
        <CacheProvider value={rtlCache}>
            <ThemeProvider theme={theme}>{children}</ThemeProvider>
        </CacheProvider>
    );
}
