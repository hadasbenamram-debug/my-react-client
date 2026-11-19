import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {DonationResponseDto, NotificationDto} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * מרכז ההתראות: ההיסטוריה מהשרת (api/notifications), התראות חדשות שהגיעו בזמן אמת בזמן שהדף פתוח,
 * ופרטי התרומות שמוצגים בתחתית הקלפים.
 * (המספר שבפעמון והחיבור ל-SignalR נמצאים ב-liveUpdatesSlice)
 */
export interface NotificationsState {
    /** null = עוד לא נטען */
    items: NotificationDto[] | null;
    status: LoadStatus;
    error: string | null;
    /** פרטי התרומה לפי מזהה - לשורה התחתונה של הקלף */
    donations: Record<number, DonationResponseDto>;
}

const initialState: NotificationsState = {items: null, status: 'idle', error: null, donations: {}};

/** היסטוריית ההתראות (100 האחרונות) */
export const fetchNotifications = createAppAsyncThunk<NotificationDto[]>(
    'notifications/fetchAll',
    async (_, {rejectWithValue}) => {
        try {
            return (await apiRequest<NotificationDto[] | null>('/api/notifications?pageSize=100')) ?? [];
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא הצלחנו לטעון את ההתראות.'));
        }
    },
);

/** פרטי תרומה אחת שמופיעה בהתראה (מה נתרם ולאיזו עמותה). בלי הפרטים הקלף מוצג בלי השורה התחתונה */
export const fetchNotificationDonation = createAppAsyncThunk<DonationResponseDto, number>(
    'notifications/fetchDonation',
    async (id, {rejectWithValue}) => {
        try {
            return await apiRequest<DonationResponseDto>(`/api/donations/${id}`);
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לטעון את פרטי התרומה.'));
        }
    },
);

/** סימון התראות כנקראו בשרת (בשרת אין "סימון כלא נקרא") */
export const markNotificationsRead = createAppAsyncThunk<void, number[]>(
    'notifications/markRead',
    async (ids, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/notifications/mark-read', {
                method: 'POST',
                body: {ids},
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לסמן את ההתראה כנקראה.'));
        }
    },
);

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        /** התראה חדשה בזמן שהדף פתוח - נכנסת לראש הרשימה (ומחליפה עותק קודם שלה, אם יש) */
        notificationPushed(state, action: PayloadAction<NotificationDto>) {
            if (!state.items) return;
            const notification = action.payload;
            state.items = [{...notification, isRead: false}, ...state.items.filter((n) => n.id !== notification.id)];
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                // כל כניסה לדף טוענת את ההיסטוריה מחדש (מסך טעינה כמו בכניסה הראשונה)
                state.items = null;
                state.status = 'loading';
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.items = action.payload;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                // הדף ממשיך לעבוד - התראות חדשות עדיין יופיעו בזמן אמת
                state.status = 'failed';
                state.error = action.payload?.message ?? 'לא הצלחנו לטעון את ההתראות.';
                state.items = [];
            })
            .addCase(fetchNotificationDonation.fulfilled, (state, action) => {
                state.donations[action.meta.arg] = action.payload;
            })
            // (markNotificationsRead לא משנה את הרשימה: החפיסה מנהלת במסך מה כבר עבר)
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export const {notificationPushed} = notificationsSlice.actions;
export default notificationsSlice.reducer;

// ───────── selectors ─────────

type WithNotifications = {notifications: NotificationsState};

export const selectNotifications = (state: WithNotifications) => state.notifications.items;
export const selectNotificationsStatus = (state: WithNotifications) => state.notifications.status;
export const selectNotificationsError = (state: WithNotifications) => state.notifications.error;
export const selectNotificationDonations = (state: WithNotifications) => state.notifications.donations;
