import {configureStore} from '@reduxjs/toolkit';
import {useDispatch, useSelector} from 'react-redux';
import authReducer, {loadAuthFromStorage, sessionReloaded, TOKEN_KEY, USER_KEY} from './authSlice';
import type {AuthState} from './authSlice';
import liveUpdatesReducer from './liveUpdatesSlice';
import uiReducer from './uiSlice';
import accountReducer from './accountSlice';
import notificationsReducer from './notificationsSlice';
import publicReducer from './publicSlice';
import donationsReducer from './donationsSlice';
import supplierReducer from './supplierSlice';
import ngoReducer from './ngoSlice';
import volunteerReducer from './volunteerSlice';
import routesReducer from './routesSlice';
import adminReducer from './adminSlice';

export const store = configureStore({
    reducer: {
        // סשן ומצב כללי
        auth: authReducer,
        liveUpdates: liveUpdatesReducer,
        ui: uiReducer,
        // נתונים מהשרת - כל סלייס עם ה-thunks של התחום שלו
        account: accountReducer,
        notifications: notificationsReducer,
        public: publicReducer,
        donations: donationsReducer,
        supplier: supplierReducer,
        ngo: ngoReducer,
        volunteer: volunteerReducer,
        routes: routesReducer,
        admin: adminReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

// ───────── שמירת הסשן ב-localStorage (כדי שרענון הדף ישאיר את המשתמש מחובר) ─────────

let persistedAuth: AuthState = store.getState().auth;

store.subscribe(() => {
    const auth = store.getState().auth;
    if (auth === persistedAuth) return;
    persistedAuth = auth;
    try {
        if (auth.token) localStorage.setItem(TOKEN_KEY, auth.token);
        else localStorage.removeItem(TOKEN_KEY);
        if (auth.token || String(auth.user.role || 'guest').toLowerCase() !== 'guest') {
            localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
        } else {
            localStorage.removeItem(USER_KEY);
        }
    } catch {
        // אין גישה ל-localStorage (גלישה פרטית וכו') - המצב נשאר בזיכרון עד רענון
    }
});

// התחברות / יציאה בלשונית אחרת - מעדכנים גם כאן
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
        if (event.key !== null && event.key !== TOKEN_KEY && event.key !== USER_KEY) return;
        const next = loadAuthFromStorage();
        persistedAuth = next;
        store.dispatch(sessionReloaded(next));
    });
}
