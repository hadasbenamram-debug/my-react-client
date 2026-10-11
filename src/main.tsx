import React from 'react';
// @ts-ignore
import { createRoot } from 'react-dom/client';
import App from './App';
// @ts-ignore
import './index.css';
// @ts-ignore
import AppThemeProvider from './theme/AppThemeProvider';

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <React.StrictMode>
            <AppThemeProvider>
                <App />
            </AppThemeProvider>
        </React.StrictMode>
    );
}