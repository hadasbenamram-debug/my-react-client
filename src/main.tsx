import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';
import AppThemeProvider from './theme/AppThemeProvider';
import {installAuthGuard} from './utils/auth';

// טוקן שבוטל / סיסמה זמנית - טיפול אחיד לכל הבקשות
installAuthGuard();

const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element #root was not found in index.html');
}

createRoot(rootElement).render(
    <React.StrictMode>
        <AppThemeProvider>
            <App />
        </AppThemeProvider>
    </React.StrictMode>
);
