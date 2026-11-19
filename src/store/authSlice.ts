import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {StoredUser} from '../types';

/**
 * הסשן (טוקן + המשתמש המחובר) - מקור אמת אחד ב-Redux.
 * הערכים נטענים מ-localStorage בעליית האפליקציה ונשמרים אליו בכל שינוי (persistAuth ב-store/index.ts),
 * כך שרענון הדף / לשונית חדשה ממשיכים מאותו מצב.
 */
export interface AuthState {
    token: string | null;
    user: StoredUser;
}

const GUEST: StoredUser = {role: 'guest'};

export const TOKEN_KEY = 'token';
export const USER_KEY = 'currentUser';

export const loadAuthFromStorage = (): AuthState => {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const stored = localStorage.getItem(USER_KEY);
        return {token, user: stored ? (JSON.parse(stored) as StoredUser) : GUEST};
    } catch {
        return {token: null, user: GUEST};
    }
};

const authSlice = createSlice({
    name: 'auth',
    initialState: loadAuthFromStorage,
    reducers: {
        /** התחברות / החלפת סיסמה - טוקן חדש ומשתמש מעודכן */
        sessionSaved(_state, action: PayloadAction<{token: string; user: StoredUser}>) {
            return {token: action.payload.token, user: action.payload.user};
        },
        /** עדכון חלקי של פרטי המשתמש (למשל שם אחרי עריכת פרופיל) */
        userUpdated(state, action: PayloadAction<Partial<StoredUser>>) {
            state.user = {...state.user, ...action.payload};
        },
        /** רשימת התפקידים המאושרים מהשרת */
        rolesSynced(state, action: PayloadAction<string[]>) {
            if (action.payload.length > 0) state.user.roles = action.payload;
        },
        /** מעבר לתפקיד אחר של אותו חשבון */
        activeRoleSet(state, action: PayloadAction<string>) {
            state.user.role = action.payload;
        },
        /** יציאה מהמערכת / טוקן שבוטל */
        sessionCleared() {
            return {token: null, user: GUEST};
        },
        /** לשונית אחרת שינתה את הסשן (אירוע storage) */
        sessionReloaded(_state, action: PayloadAction<AuthState>) {
            return action.payload;
        },
    },
});

export const {sessionSaved, userUpdated, rolesSynced, activeRoleSet, sessionCleared, sessionReloaded} = authSlice.actions;
export default authSlice.reducer;

// ───────── selectors ─────────

type WithAuth = {auth: AuthState};

export const selectToken = (state: WithAuth) => state.auth.token;
export const selectCurrentUser = (state: WithAuth) => state.auth.user;
/** התפקיד הפעיל באותיות קטנות ('guest' כשאין) */
export const selectActiveRole = (state: WithAuth) =>
    String(state.auth.user.role || state.auth.user.type || 'guest').toLowerCase();
export const selectIsLoggedIn = (state: WithAuth) =>
    !!state.auth.token && selectActiveRole(state) !== 'guest';
export const selectIsVolunteer = (state: WithAuth) =>
    selectIsLoggedIn(state) && selectActiveRole(state).includes('volunt');
