import {createSlice} from '@reduxjs/toolkit';
import type {PublicStatsDto} from '../types/api';
import {apiFetchRaw, apiRequest, toApiError, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {ASSISTANT_STREAM_URL, readAssistantStream} from '../utils/assistantStream';
import type {AssistantMessage, AssistantStreamHandlers} from '../utils/assistantStream';

/**
 * החלקים הציבוריים של האתר: הנתונים של "ההשפעה שלנו" בדף הבית, טופס צור קשר, והעוזר החכם.
 * (שיחת העוזר עצמה נשמרת ב-state המקומי של useAssistantChat - כאן רק השליחה לשרת)
 */
export interface PublicState {
    stats: PublicStatsDto | null;
    statsStatus: LoadStatus;
}

const initialState: PublicState = {stats: null, statsStatus: 'idle'};

/** תיקון 31: המספרים האמיתיים מהמסד (GET api/stats/public - פתוח גם לאורחים). ניתן לבטל (abort) ביציאה מהדף */
export const fetchPublicStats = createAppAsyncThunk<PublicStatsDto>(
    'public/fetchStats',
    async (_, {rejectWithValue, signal}) => {
        try {
            return await apiRequest<PublicStatsDto>('/api/stats/public', {auth: false, signal});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא הצלחנו לטעון כרגע את הנתונים העדכניים.'));
        }
    },
);

/** פנייה מטופס צור קשר (פתוח גם לאורחים) */
export interface ContactMessageArgs {
    name: string;
    email: string;
    phone: string | null;
    subject: string;
    message: string;
}

// הנתיב יחסי - עובר דרך ה-proxy של Vite אל השרת
/** שליחת טופס צור קשר. 429 = יותר מדי פניות, 400 = ולידציה (ההודעות לפי שדה ב-errors) */
export const sendContactMessage = createAppAsyncThunk<void, ContactMessageArgs>(
    'public/sendContactMessage',
    async (body, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/support/contact', {
                method: 'POST',
                body,
                auth: false,
                responseType: 'none',
                fallbackMessage: 'אירעה שגיאה בשליחת הפנייה. נסו שוב.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'אירעה שגיאה בשליחת הפנייה. נסו שוב.'));
        }
    },
);

/** הארגומנט של streamAssistantReply. ה-callbacks וה-signal לא נשמרים ב-state - הם רק עוברים ל-thunk */
export interface StreamAssistantArgs extends AssistantStreamHandlers {
    /** כל השיחה (השרת לא שומר שיחות) */
    history: AssistantMessage[];
    /** התפקיד הפעיל בתפריט. השרת בודק אותו מול התפקידים המאושרים של החשבון */
    role: string | undefined;
    /** לעצירה (כפתור "עצור" / סגירת הדף): השרת מקבל ביטול ומפסיק לפנות למודל */
    signal: AbortSignal;
}

/** קוד בתשובה שנדחתה כשהמשתמש עצר את התשובה (ולא שגיאה) */
export const ASSISTANT_ABORTED_CODE = 'Aborted';

/**
 * העוזר החכם: שולח את השיחה וקורא את התשובה בהזרמה. כל חלק מגיע ל-onText / onStatus מיד כשהוא מתקבל,
 * וה-thunk מסתיים כשהתשובה נגמרה. עצירה דרך signal -> נדחה עם code = Aborted.
 */
export const streamAssistantReply = createAppAsyncThunk<void, StreamAssistantArgs>(
    'public/streamAssistantReply',
    async ({history, role, onText, onStatus, signal}, {rejectWithValue}) => {
        try {
            const res = await apiFetchRaw(ASSISTANT_STREAM_URL, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({messages: history, activeRole: role}),
                signal,
            });

            // שגיאה לפני ההזרמה (ולידציה, הגבלת קצב, העוזר לא מוגדר...) - אותו מבנה שגיאה כמו בכל ה-API
            if (!res.ok || !res.body) throw await toApiError(res, 'לא הצלחנו לקבל תשובה מהעוזר. נסו שוב.');

            await readAssistantStream(res.body, {onText, onStatus});
        } catch (err) {
            if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
                return rejectWithValue({message: 'התשובה נעצרה.', status: 0, code: ASSISTANT_ABORTED_CODE});
            }
            return rejectWithValue(toErrorPayload(err, 'משהו השתבש. נסו שוב.'));
        }
    },
);

const publicSlice = createSlice({
    name: 'public',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchPublicStats.pending, (state) => {
                state.statsStatus = 'loading';
            })
            .addCase(fetchPublicStats.fulfilled, (state, action) => {
                state.statsStatus = 'succeeded';
                state.stats = action.payload;
            })
            .addCase(fetchPublicStats.rejected, (state, action) => {
                // יציאה מהדף לפני שהנתונים הגיעו (abort) - לא נחשב כשל
                if (action.meta.aborted) return;
                state.statsStatus = 'failed';
            });
    },
});

export default publicSlice.reducer;

// ───────── selectors ─────────

type WithPublic = {public: PublicState};

export const selectPublicStats = (state: WithPublic) => state.public.stats;
export const selectPublicStatsStatus = (state: WithPublic) => state.public.statsStatus;
