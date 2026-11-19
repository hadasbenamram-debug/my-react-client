import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {RouteDto} from '../types/api';
import {apiRequest} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import {selectIsLoggedIn, selectIsVolunteer, sessionCleared} from './authSlice';

/**
 * עדכונים חיים (תיקונים 45 + 50): מספר ההתראות שלא נקראו, "גרסה" שמשתנה בכל אירוע מהשרת
 * (הדפים נטענים מחדש), ובקשת האיסוף שממתינה למתנדב.
 * חיבור ה-SignalR עצמו נשאר ב-LiveUpdatesProvider - הוא רק שולח לכאן פעולות.
 */
export interface LiveUpdatesState {
    unread: number;
    version: number;
    pendingOffer: RouteDto | null;
}

const initialState: LiveUpdatesState = {unread: 0, version: 0, pendingOffer: null};

/** כמה התראות לא נקראו (לפעמון בכותרת). null = לא לעדכן */
export const fetchUnreadCount = createAppAsyncThunk<number | null>(
    'liveUpdates/fetchUnreadCount',
    async () => {
        try {
            const body = await apiRequest<{count?: number} | null>('/api/notifications/unread-count');
            return body && typeof body.count === 'number' ? body.count : null;
        } catch {
            return null;
        }
    },
    {condition: (_, {getState}) => selectIsLoggedIn(getState())},
);

/** מתנדב: הבקשה שממתינה לתשובה שלו. undefined = שגיאה, לא לשנות את המצב */
export const fetchPendingOffer = createAppAsyncThunk<RouteDto | null | undefined>(
    'liveUpdates/fetchPendingOffer',
    async () => {
        try {
            // אין מסלול פעיל -> השרת מחזיר 204 (null)
            const route = await apiRequest<RouteDto | null>('/api/matches/routes/my-active');
            return route && route.awaitingResponse ? route : null;
        } catch {
            return undefined;
        }
    },
    {condition: (_, {getState}) => selectIsVolunteer(getState())},
);

const liveUpdatesSlice = createSlice({
    name: 'liveUpdates',
    initialState,
    reducers: {
        /** התראה חדשה מהשרת */
        notificationReceived(state) {
            state.unread += 1;
            state.version += 1;
        },
        /** טוענים מחדש את הדפים הפתוחים */
        versionBumped(state) {
            state.version += 1;
        },
        allMarkedRead(state) {
            state.unread = 0;
        },
        unreadSet(state, action: PayloadAction<number>) {
            state.unread = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                if (action.payload !== null) state.unread = action.payload;
            })
            .addCase(fetchPendingOffer.fulfilled, (state, action) => {
                if (action.payload !== undefined) state.pendingOffer = action.payload;
            })
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export const {notificationReceived, versionBumped, allMarkedRead, unreadSet} = liveUpdatesSlice.actions;
export default liveUpdatesSlice.reducer;

type WithLive = {liveUpdates: LiveUpdatesState};

export const selectUnread = (state: WithLive) => state.liveUpdates.unread;
export const selectVersion = (state: WithLive) => state.liveUpdates.version;
export const selectPendingOffer = (state: WithLive) => state.liveUpdates.pendingOffer;
