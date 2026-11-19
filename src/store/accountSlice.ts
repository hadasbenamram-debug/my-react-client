import {createSlice} from '@reduxjs/toolkit';
import type {AuthResponseDto, ChangePasswordResponse, LinkLoginResponseDto, MyProfileDto} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * החשבון של המשתמש המחובר: הפרופיל (api/users/me) - נטען פעם אחת ומשותף לכל המסכים שצריכים אותו
 * (פרופיל, ברכה בדשבורד, הוספת תפקיד, מעבר בין תפקידים), וכל הפעולות על החשבון:
 * התחברות, איפוס / החלפת סיסמה, אימות מייל וטלפון, כניסה מקישור ומחיקת החשבון.
 */
export interface AccountState {
    profile: MyProfileDto | null;
    profileStatus: LoadStatus;
    profileError: string | null;
}

const initialState: AccountState = {profile: null, profileStatus: 'idle', profileError: null};

/** ערוץ אימות / שליחת קוד */
export type VerificationChannel = 'email' | 'phone';
/** תיקון 64: קוד לטלפון - במסרון או בשיחה קולית */
export type PhoneCodeMethod = 'sms' | 'call';

/** תשובה עם הודעה אופציונלית מהשרת ("נשלח במסרון", "הסיסמה אופסה"...) */
export interface ServerMessage {
    message?: string;
}

/** קורא תשובת JSON שאולי ריקה / לא תקינה - בלי לזרוק (כמו response.json().catch(() => null)) */
const parseMessage = (text: string): ServerMessage | null => {
    try {
        return text ? (JSON.parse(text) as ServerMessage) : null;
    } catch {
        return null;
    }
};

// ───────── הפרופיל ─────────

/** טעינת הפרופיל שלי (GET api/users/me) - thunk אחד לכל המסכים שצריכים את פרטי החשבון */
export const fetchMyProfile = createAppAsyncThunk<MyProfileDto>(
    'account/fetchMyProfile',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<MyProfileDto>('/api/users/me', {fallbackMessage: 'לא ניתן לטעון את הפרופיל.'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לטעון את הפרופיל.'));
        }
    },
);

export interface UpdateProfileArgs {
    name: string;
    phone: string;
}

/** עדכון שם וטלפון (PUT api/users/me). השרת מחזיר את הפרופיל המעודכן (שינוי טלפון מבטל את אימותו) */
export const updateMyProfile = createAppAsyncThunk<MyProfileDto, UpdateProfileArgs>(
    'account/updateMyProfile',
    async (args, {rejectWithValue}) => {
        try {
            return await apiRequest<MyProfileDto>('/api/users/me', {
                method: 'PUT',
                body: {name: args.name, phone: args.phone},
                fallbackMessage: 'שגיאה בעדכון הפרופיל.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בעדכון הפרופיל.'));
        }
    },
);

// ───────── סיסמה ─────────

export interface ChangePasswordArgs {
    currentPassword: string;
    newPassword: string;
}

/** החלפת סיסמה. השרת מבטל את כל הטוקנים הקודמים ומחזיר טוקן חדש (הדף שומר אותו עם saveSession) */
export const changePassword = createAppAsyncThunk<ChangePasswordResponse, ChangePasswordArgs>(
    'account/changePassword',
    async (args, {rejectWithValue}) => {
        try {
            return await apiRequest<ChangePasswordResponse>('/api/auth/change-password', {
                method: 'POST',
                body: {currentPassword: args.currentPassword, newPassword: args.newPassword},
                fallbackMessage: 'שגיאה בשינוי הסיסמה.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בשינוי הסיסמה.'));
        }
    },
);

export interface RequestPasswordResetArgs {
    email: string;
    /** email = קישור + קוד במייל; sms / call = קוד לטלפון המאומת (תיקון 67) */
    method: 'email' | PhoneCodeMethod;
}

/** תיקון 69: "שכחת סיסמה?" - שליחת קוד / קישור לאיפוס. השרת מחזיר תמיד אותה הודעה כללית */
export const requestPasswordReset = createAppAsyncThunk<ServerMessage | null, RequestPasswordResetArgs>(
    'account/requestPasswordReset',
    async ({email, method}, {rejectWithValue}) => {
        try {
            const text = method === 'email'
                ? await apiRequest<string>('/api/auth/forgot-password', {
                    method: 'POST', body: {email}, auth: false, responseType: 'text',
                    fallbackMessage: 'לא ניתן לשלוח את הקוד כרגע.',
                })
                : await apiRequest<string>('/api/auth/forgot-password-phone', {
                    method: 'POST', body: {email, method}, auth: false, responseType: 'text',
                    fallbackMessage: 'לא ניתן לשלוח את הקוד כרגע.',
                });
            return parseMessage(text);
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לשלוח את הקוד כרגע.'));
        }
    },
);

export type ResetPasswordArgs =
    | {channel: 'email'; token: string; newPassword: string}
    | {channel: 'phone'; email: string; code: string; newPassword: string};

/** איפוס הסיסמה עם הקוד מהמייל או מהטלפון */
export const resetPassword = createAppAsyncThunk<ServerMessage | null, ResetPasswordArgs>(
    'account/resetPassword',
    async (args, {rejectWithValue}) => {
        try {
            const text = args.channel === 'email'
                ? await apiRequest<string>('/api/auth/reset-password', {
                    method: 'POST', body: {token: args.token, newPassword: args.newPassword}, auth: false,
                    responseType: 'text', fallbackMessage: 'איפוס הסיסמה נכשל.',
                })
                : await apiRequest<string>('/api/auth/reset-password-phone', {
                    method: 'POST', body: {email: args.email, code: args.code, newPassword: args.newPassword}, auth: false,
                    responseType: 'text', fallbackMessage: 'איפוס הסיסמה נכשל.',
                });
            return parseMessage(text);
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'איפוס הסיסמה נכשל.'));
        }
    },
);

// ───────── אימות מייל וטלפון ─────────

export interface SendVerificationArgs {
    channel: VerificationChannel;
    method?: PhoneCodeMethod;
}

/** שליחת קוד אימות חד-פעמי למייל או לטלפון (במסרון / בשיחה קולית) */
export const sendVerificationCode = createAppAsyncThunk<ServerMessage | null, SendVerificationArgs>(
    'account/sendVerificationCode',
    async ({channel, method = 'sms'}, {rejectWithValue}) => {
        try {
            const text = await apiRequest<string>(`/api/auth/send-${channel}-verification`, {
                method: 'POST',
                body: channel === 'phone' ? {method} : undefined,
                responseType: 'text',
                fallbackMessage: 'לא ניתן לשלוח קוד כרגע.',
            });
            return parseMessage(text);
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לשלוח קוד כרגע.'));
        }
    },
);

export interface VerifyCodeArgs {
    channel: VerificationChannel;
    code: string;
}

/** בדיקת הקוד שהמשתמש הזין. בהצלחה הפרופיל בסלייס מסומן כמאומת */
export const verifyContactCode = createAppAsyncThunk<void, VerifyCodeArgs>(
    'account/verifyContactCode',
    async ({channel, code}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/auth/verify-${channel}`, {
                method: 'POST',
                body: {code},
                responseType: 'none',
                fallbackMessage: 'הקוד שגוי או שפג תוקפו.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הקוד שגוי או שפג תוקפו.'));
        }
    },
);

// ───────── התחברות וכניסה מקישור ─────────

export interface LoginArgs {
    email: string;
    password: string;
}

/**
 * התחברות. מחזיר את AuthResponseDto - הדף שומר את הסשן (saveSession) ומחליט לאן לעבור.
 * בכישלון: ההודעה מהשרת (סיסמה שגויה, חשבון נעול...) ב-message, וה-status / code לטיפול מיוחד.
 */
export const login = createAppAsyncThunk<AuthResponseDto, LoginArgs>(
    'account/login',
    async ({email, password}, {rejectWithValue}) => {
        try {
            return await apiRequest<AuthResponseDto>('/api/auth/login', {
                method: 'POST',
                body: {email, password},
                auth: false,
                fallbackMessage: 'שגיאה בפרטי ההתחברות',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בפרטי ההתחברות'));
        }
    },
);

export interface LinkLoginArgs {
    token: string;
    newPassword?: string;
}

/** כניסה מהקישור במייל "הבקשה שלך אושרה" (חד-פעמי). אולי צריך קודם לבחור סיסמה (requiresPassword) */
export const linkLogin = createAppAsyncThunk<LinkLoginResponseDto, LinkLoginArgs>(
    'account/linkLogin',
    async ({token, newPassword}, {rejectWithValue}) => {
        try {
            return await apiRequest<LinkLoginResponseDto>('/api/auth/link-login', {
                method: 'POST',
                body: {token, newPassword: newPassword ?? null},
                auth: false,
                fallbackMessage: 'קישור הכניסה אינו בתוקף. אפשר להתחבר כרגיל עם המייל והסיסמה.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'קישור הכניסה אינו בתוקף. אפשר להתחבר כרגיל עם המייל והסיסמה.'));
        }
    },
);

// ───────── מחיקת החשבון ─────────

/** תיקון 77: מחיקה רכה של החשבון, עם אימות הסיסמה. אחרי ההצלחה הקומפוננטה יוצאת מהמערכת */
export const deleteAccount = createAppAsyncThunk<void, {password: string}>(
    'account/deleteAccount',
    async ({password}, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/users/me', {
                method: 'DELETE',
                body: {password},
                responseType: 'none',
                fallbackMessage: 'מחיקת החשבון נכשלה. נסו שוב.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'מחיקת החשבון נכשלה. נסו שוב.'));
        }
    },
);

const accountSlice = createSlice({
    name: 'account',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchMyProfile.pending, (state) => {
                state.profileStatus = 'loading';
                state.profileError = null;
            })
            .addCase(fetchMyProfile.fulfilled, (state, action) => {
                state.profileStatus = 'succeeded';
                state.profile = action.payload;
            })
            .addCase(fetchMyProfile.rejected, (state, action) => {
                state.profileStatus = 'failed';
                state.profileError = action.payload?.message ?? 'לא ניתן לטעון את הפרופיל.';
            })
            // הפרופיל המעודכן מהשרת (כולל סטטוס האימות)
            .addCase(updateMyProfile.fulfilled, (state, action) => {
                state.profile = action.payload;
            })
            .addCase(verifyContactCode.fulfilled, (state, action) => {
                if (!state.profile) return;
                if (action.meta.arg.channel === 'email') state.profile.isEmailVerified = true;
                else state.profile.isPhoneVerified = true;
            })
            .addCase(changePassword.fulfilled, (state) => {
                if (state.profile) state.profile.mustChangePassword = false;
            })
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export default accountSlice.reducer;

// ───────── selectors ─────────

type WithAccount = {account: AccountState};

export const selectMyProfile = (state: WithAccount) => state.account.profile;
export const selectMyProfileStatus = (state: WithAccount) => state.account.profileStatus;
export const selectMyProfileError = (state: WithAccount) => state.account.profileError;
