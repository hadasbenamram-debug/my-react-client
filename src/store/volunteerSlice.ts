import {createSlice} from '@reduxjs/toolkit';
import type {
    AvailabilitySlotResponseDto,
    FeedbackView,
    MatchResponseDto,
    RespondByLinkResultDto,
    RouteDto,
} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {selectToken, sessionCleared} from './authSlice';

/**
 * הנתונים של המתנדב: המסלול הפעיל, בקשה נכנסת, בקשה מהקישור במייל, זמינות שבועית,
 * היסטוריית שיבוצים ומשובים. כל הקריאות לשרת - ב-thunks שכאן.
 * מצב תצוגה מקומי (טפסים, חלונות, הודעות, busy) נשאר ב-useState של הדפים.
 */

// ───────────────────────── טיפוסים ─────────────────────────

/** נתונים שנטענים מהשרת, עם מצב טעינה ושגיאה */
export interface Loadable<T> {
    data: T;
    status: LoadStatus;
    error: string | null;
}

/** משבצת זמינות כפי שהיא מוצגת ונערכת בדף הזמינות */
export interface AvailabilitySlot {
    /** מזהה מקומי לרשימה בלבד (לא נשלח לשרת) */
    key: number;
    day: number;
    startTime: string;
    endTime: string;
    regionId: number;
    /** 0 = אותו אזור (לא נוסע לאזור אחר) */
    toRegionId: number;
}

export interface RegionOption {
    id: number;
    regionName?: string;
    name?: string;
}

export interface AvailabilityData {
    regions: RegionOption[];
    slots: AvailabilitySlot[];
}

/** הבקשה הנכנסת - לפי מזהה שיבוץ מהכתובת, או "active" (הבקשה הפעילה) */
export interface IncomingRequestState extends Loadable<RouteDto | null> {
    /** לאיזו כתובת שייכים הנתונים (id מהכתובת או 'active') */
    key: string | null;
}

/** פרטי ההרשמה כמתנדב (מחובר: רק פרטי ההתנדבות; לא מחובר: גם פרטי משתמש) */
export interface VolunteerRegisterArgs {
    loggedIn: boolean;
    body: Record<string, unknown>;
}

export interface VolunteerState {
    /** המסלול הפעיל (api/matches/routes/my-active) - דשבורד, מסלול פעיל */
    activeRoute: Loadable<RouteDto | null>;
    incoming: IncomingRequestState;
    /** בקשה מהקישור במייל (בלי התחברות) */
    byLink: Loadable<RouteDto | null>;
    availability: Loadable<AvailabilityData>;
    history: Loadable<MatchResponseDto[]>;
    feedbacks: Loadable<FeedbackView[]>;
}

const initialState: VolunteerState = {
    activeRoute: {data: null, status: 'idle', error: null},
    incoming: {key: null, data: null, status: 'idle', error: null},
    byLink: {data: null, status: 'idle', error: null},
    availability: {data: {regions: [], slots: []}, status: 'idle', error: null},
    history: {data: [], status: 'idle', error: null},
    feedbacks: {data: [], status: 'idle', error: null},
};

/** מזהה מקומי למשבצת זמינות (משותף לטעינה מהשרת ולמשבצות חדשות בדף) */
let nextKey = 1;
export const nextSlotKey = (): number => nextKey++;

/** silent: רענון ברקע - בלי להחליף את הדף בסמל טעינה */
export interface SilentArg {
    silent?: boolean;
}

// ───────────────────────── המסלול הפעיל ─────────────────────────

/** המסלול הפעיל של המתנדב. אין מסלול -> השרת מחזיר 204 (null) */
export const fetchMyActiveRoute = createAppAsyncThunk<RouteDto | null, SilentArg | undefined>(
    'volunteer/fetchMyActiveRoute',
    async (_arg, {rejectWithValue}) => {
        try {
            return await apiRequest<RouteDto | null>('/api/matches/routes/my-active');
        } catch (err) {
            // ההודעה הקבועה של הדשבורד (גם כשהשרת החזיר הודעה משלו)
            return rejectWithValue({...toErrorPayload(err, 'שגיאה בטעינת הנתונים.'), message: 'שגיאה בטעינת הנתונים.'});
        }
    },
);

/** מתנדב בדרך: שליחת המיקום הנוכחי לשרת (נרשם ביומן המשלוח) */
export const sendVolunteerLocation = createAppAsyncThunk<void, {lat: number; lng: number}>(
    'volunteer/sendLocation',
    async ({lat, lng}, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/volunteers/me/location', {
                method: 'PUT',
                body: {latitude: lat, longitude: lng},
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'המיקום לא נשמר בשרת.'));
        }
    },
);

/** יציאה לדרך במסלול */
export const startRoute = createAppAsyncThunk<void, number>(
    'volunteer/startRoute',
    async (routeId, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/matches/routes/${routeId}/start`, {method: 'POST', responseType: 'none'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הפעולה נכשלה.'));
        }
    },
);

/** "אספתי" - איסוף בתחנה אחת */
export const markPickedUp = createAppAsyncThunk<void, number>(
    'volunteer/markPickedUp',
    async (matchId, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/matches/${matchId}/picked-up`, {method: 'POST', responseType: 'none'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הפעולה נכשלה.'));
        }
    },
);

/** מסירה לעמותה של תרומה אחת (בשביל "מסרתי הכול" - תחנה אחרי תחנה) */
export const completeMatch = createAppAsyncThunk<void, number>(
    'volunteer/completeMatch',
    async (matchId, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/matches/${matchId}/complete`, {method: 'POST', responseType: 'none'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'המסירה לא נרשמה.'));
        }
    },
);

// ───────────────────────── בקשה נכנסת ─────────────────────────

/**
 * הבקשה הנכנסת: לפי מזהה שיבוץ (השיבוץ ואז המסלול שלו), או הבקשה הפעילה של המתנדב.
 * בלי id - כל תשובה שאינה מסלול נחשבת "אין בקשה" (null) ולא שגיאה.
 */
export const fetchIncomingRequest = createAppAsyncThunk<RouteDto | null, {id?: string; silent?: boolean}>(
    'volunteer/fetchIncomingRequest',
    async ({id}, {rejectWithValue}) => {
        if (!id) {
            try {
                return await apiRequest<RouteDto | null>('/api/matches/routes/my-active');
            } catch {
                return null;
            }
        }
        let match: MatchResponseDto;
        try {
            match = await apiRequest<MatchResponseDto>(`/api/matches/${id}`, {fallbackMessage: 'הבקשה לא נמצאה.'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הבקשה לא נמצאה.'));
        }
        if (!match.volunteerRouteId) return null;
        try {
            return await apiRequest<RouteDto>(`/api/matches/routes/${match.volunteerRouteId}`);
        } catch {
            return null;
        }
    },
);

/** תשובה לבקשה (אישור / דחייה) - אחת לכל המסלול, דרך השיבוץ הראשון */
export const respondToRequest = createAppAsyncThunk<void, {matchId: number; accept: boolean}>(
    'volunteer/respondToRequest',
    async ({matchId, accept}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/matches/${matchId}/${accept ? 'accept' : 'decline'}`, {
                method: 'POST',
                responseType: 'none',
            });
        } catch (err) {
            // ה-code (למשל Expired) נשמר - הדף מציג אותו כהודעה רגילה ולא כשגיאה
            return rejectWithValue(toErrorPayload(err, 'הפעולה נכשלה.'));
        }
    },
);

// ───────────────────────── קישור מהמייל (בלי התחברות) ─────────────────────────

/** טעינת הבקשה לפי הטוקן החד-פעמי מהמייל (accept: false = רק צפייה) */
export const fetchRouteByLink = createAppAsyncThunk<RouteDto, string>(
    'volunteer/fetchRouteByLink',
    async (token, {rejectWithValue}) => {
        try {
            return await apiRequest<RouteDto>('/api/matches/by-link', {
                method: 'POST',
                body: {token, accept: false},
                auth: false,
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הקישור אינו בתוקף.'));
        }
    },
);

/** תשובה לבקשה מהקישור במייל. באישור השרת יכול להחזיר גם כניסה למערכת (session) */
export const respondByLink = createAppAsyncThunk<RespondByLinkResultDto, {token: string; accept: boolean}>(
    'volunteer/respondByLink',
    async ({token, accept}, {rejectWithValue}) => {
        try {
            return await apiRequest<RespondByLinkResultDto>('/api/matches/respond-by-link', {
                method: 'POST',
                body: {token, accept},
                auth: false,
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'הפעולה נכשלה.'));
        }
    },
);

// ───────────────────────── הרשמה ─────────────────────────

/** הרשמה כמתנדב: משתמש חדש (בלי טוקן), או הוספת תפקיד מתנדב לחשבון מחובר. מחזיר את ההודעה מהשרת (אם יש) */
export const registerVolunteer = createAppAsyncThunk<string | null, VolunteerRegisterArgs>(
    'volunteer/register',
    async ({loggedIn, body}, {rejectWithValue}) => {
        try {
            // התשובה לא תמיד JSON - קוראים כטקסט ומפענחים בזהירות (כמו response.json().catch(() => null))
            const text = await apiRequest<string>(loggedIn ? '/api/volunteers' : '/api/volunteers/register', {
                method: 'POST',
                body,
                auth: loggedIn,
                responseType: 'text',
            });
            let result: {message?: string} | null = null;
            try {
                result = text ? (JSON.parse(text) as {message?: string} | null) : null;
            } catch {
                result = null;
            }
            return result?.message || null;
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'אירעה שגיאה בעת הרישום. נסה שוב.'));
        }
    },
);

// ───────────────────────── זמינות שבועית ─────────────────────────

/** האזורים ומשבצות הזמינות של המתנדב (שתי קריאות במקביל) */
export const fetchAvailability = createAppAsyncThunk<AvailabilityData>(
    'volunteer/fetchAvailability',
    async (_, {getState, rejectWithValue}) => {
        // תוקן: בעבר טוקן מהכתובת נשמר כטוקן התחברות. עכשיו רק הטוקן מההתחברות.
        if (!selectToken(getState())) {
            return rejectWithValue({message: 'לא נמצא טוקן התחברות. אנא התחבר מחדש למערכת.', status: 401});
        }
        try {
            const [regionsData, slotsData] = await Promise.all([
                apiRequest<RegionOption[]>('/api/region'),
                apiRequest<AvailabilitySlotResponseDto[]>('/api/volunteers/availability'),
            ]);
            const regions = Array.isArray(regionsData) ? regionsData : [];
            const slots = (Array.isArray(slotsData) ? slotsData : []).map((slot): AvailabilitySlot => ({
                key: nextSlotKey(),
                day: slot.day ?? 0,
                startTime: slot.startTime ? slot.startTime.substring(0, 5) : '08:00',
                endTime: slot.endTime ? slot.endTime.substring(0, 5) : '12:00',
                regionId: slot.regionId ?? (regions[0]?.id || 1),
                toRegionId: slot.toRegionId ?? 0,
            }));
            return {regions, slots};
        } catch (err) {
            console.error('Error fetching data:', err);
            return rejectWithValue({...toErrorPayload(err), message: 'שגיאה בטעינת הנתונים מהשרת.'});
        }
    },
);

/**
 * שמירת הזמינות: נשלחת תמיד הרשימה המלאה (ordered - ממוינת לפי יום ושעה).
 * בהצלחה הרשימה בסלייס מתעדכנת ל-slots.
 */
export const saveAvailability = createAppAsyncThunk<AvailabilitySlot[], {slots: AvailabilitySlot[]; ordered: AvailabilitySlot[]}>(
    'volunteer/saveAvailability',
    async ({slots, ordered}, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/volunteers/availability', {
                method: 'POST',
                body: ordered.map(({key: _key, ...s}) => ({...s, toRegionId: s.toRegionId === 0 ? null : s.toRegionId})),
                responseType: 'none',
            });
            return slots;
        } catch (err) {
            console.error('Error saving availability:', err);
            return rejectWithValue(toErrorPayload(err, 'שגיאה בשמירת הנתונים. נסו שוב.'));
        }
    },
);

// ───────────────────────── היסטוריה ומשובים ─────────────────────────

/** היסטוריית השיבוצים של המתנדב (גם אלה שהסתיימו) */
export const fetchAssignmentHistory = createAppAsyncThunk<MatchResponseDto[]>(
    'volunteer/fetchAssignmentHistory',
    async (_, {rejectWithValue}) => {
        try {
            const data = await apiRequest<MatchResponseDto[]>('/api/matches/my-history');
            return Array.isArray(data) ? data : [];
        } catch (err) {
            const payload = toErrorPayload(err, 'לא הצלחנו לטעון את ההיסטוריה. נא לרענן את הדף.');
            // אין תקשורת עם השרת - הודעה אחרת
            return rejectWithValue(payload.status === 0
                ? {...payload, message: 'לא הצלחנו לטעון את ההיסטוריה. נא לבדוק את החיבור ולרענן את הדף.'}
                : payload);
        }
    },
);

/** המשובים והדירוגים על פעילות המתנדבים */
export const fetchFeedbacks = createAppAsyncThunk<FeedbackView[]>(
    'volunteer/fetchFeedbacks',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<FeedbackView[]>('/api/feedbacks');
        } catch (err) {
            console.error(err);
            return rejectWithValue({...toErrorPayload(err), message: 'שגיאה בטעינת המשובים מהשרת'});
        }
    },
);

// ───────────────────────── הסלייס ─────────────────────────

const volunteerSlice = createSlice({
    name: 'volunteer',
    initialState,
    reducers: {
        /** הבקשה הנכנסת נדחתה - אין יותר מה להציג */
        incomingCleared(state) {
            state.incoming.data = null;
        },
        /** הבקשה מהקישור כבר לא ממתינה לתשובה (זמן התגובה עבר / נענתה) */
        byLinkClosed(state) {
            if (state.byLink.data) state.byLink.data.awaitingResponse = false;
        },
        /** מתחילים קישור חדש מהמייל */
        byLinkReset(state) {
            state.byLink = initialState.byLink;
        },
    },
    extraReducers: (builder) => {
        builder
            // המסלול הפעיל. רענון ברקע שנכשל לא "מעלים" את המסלול מהמסך
            .addCase(fetchMyActiveRoute.pending, (state, action) => {
                if (!action.meta.arg?.silent) state.activeRoute.status = 'loading';
            })
            .addCase(fetchMyActiveRoute.fulfilled, (state, action) => {
                state.activeRoute = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchMyActiveRoute.rejected, (state, action) => {
                state.activeRoute.status = 'failed';
                state.activeRoute.error = action.payload?.message ?? 'שגיאה בטעינת הנתונים.';
                // 404 = אין מסלול פעיל
                if (action.payload?.status === 404) state.activeRoute.data = null;
            })

            // בקשה נכנסת
            .addCase(fetchIncomingRequest.pending, (state, action) => {
                const key = action.meta.arg.id ?? 'active';
                if (state.incoming.key !== key) {
                    state.incoming = {key, data: null, status: 'loading', error: null};
                } else if (!action.meta.arg.silent) {
                    state.incoming.status = 'loading';
                }
            })
            .addCase(fetchIncomingRequest.fulfilled, (state, action) => {
                // תשובה מאוחרת של בקשה אחרת - לא דורסת את מה שמוצג עכשיו
                if (state.incoming.key !== (action.meta.arg.id ?? 'active')) return;
                state.incoming ={key: action.meta.arg.id ?? 'active', data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchIncomingRequest.rejected, (state, action) => {
                state.incoming.status = 'failed';
                state.incoming.error = action.payload?.message ?? 'שגיאה בטעינת הבקשה.';
            })

            // קישור מהמייל
            .addCase(fetchRouteByLink.pending, (state) => {
                state.byLink = {data: null, status: 'loading', error: null};
            })
            .addCase(fetchRouteByLink.fulfilled, (state, action) => {
                state.byLink = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchRouteByLink.rejected, (state, action) => {
                state.byLink.status = 'failed';
                state.byLink.error = action.payload?.message ?? 'הקישור אינו בתוקף.';
            })
            .addCase(respondByLink.fulfilled, (state, action) => {
                state.byLink.data = action.payload.route;
            })

            // זמינות שבועית
            .addCase(fetchAvailability.pending, (state) => {
                state.availability.status = 'loading';
                state.availability.error = null;
            })
            .addCase(fetchAvailability.fulfilled, (state, action) => {
                state.availability = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchAvailability.rejected, (state, action) => {
                state.availability.status = 'failed';
                state.availability.error = action.payload?.message ?? 'שגיאה בטעינת הנתונים מהשרת.';
            })
            .addCase(saveAvailability.fulfilled, (state, action) => {
                state.availability.data.slots = action.payload;
            })

            // היסטוריה
            .addCase(fetchAssignmentHistory.pending, (state) => {
                state.history.status = 'loading';
                state.history.error = null;
            })
            .addCase(fetchAssignmentHistory.fulfilled, (state, action) => {
                state.history = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchAssignmentHistory.rejected, (state, action) => {
                state.history.status = 'failed';
                state.history.error = action.payload?.message ?? 'לא הצלחנו לטעון את ההיסטוריה. נא לרענן את הדף.';
            })

            // משובים
            .addCase(fetchFeedbacks.pending, (state) => {
                state.feedbacks.status = 'loading';
                state.feedbacks.error = null;
            })
            .addCase(fetchFeedbacks.fulfilled, (state, action) => {
                state.feedbacks = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchFeedbacks.rejected, (state, action) => {
                state.feedbacks.status = 'failed';
                state.feedbacks.error = action.payload?.message ?? 'שגיאה בטעינת המשובים מהשרת';
            })

            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם.
            // הבקשה מהקישור במייל נשארת: אחרי אישור בקישור הדף מחליף את הסשן (clearSession + saveSession)
            // ועדיין מציג את המסלול שאושר.
            .addCase(sessionCleared, (state) => ({...initialState, byLink: state.byLink}));
    },
});

export const {incomingCleared, byLinkClosed, byLinkReset} = volunteerSlice.actions;
export default volunteerSlice.reducer;

// ───────────────────────── selectors ─────────────────────────

type WithVolunteer = {volunteer: VolunteerState};

export const selectActiveRoute = (state: WithVolunteer) => state.volunteer.activeRoute.data;
export const selectActiveRouteStatus = (state: WithVolunteer) => state.volunteer.activeRoute.status;
export const selectActiveRouteError = (state: WithVolunteer) => state.volunteer.activeRoute.error;

export const selectIncoming = (state: WithVolunteer) => state.volunteer.incoming;

export const selectByLinkRoute = (state: WithVolunteer) => state.volunteer.byLink.data;
export const selectByLinkStatus = (state: WithVolunteer) => state.volunteer.byLink.status;

export const selectAvailability = (state: WithVolunteer) => state.volunteer.availability.data;
export const selectAvailabilityStatus = (state: WithVolunteer) => state.volunteer.availability.status;
export const selectAvailabilityError = (state: WithVolunteer) => state.volunteer.availability.error;

export const selectAssignmentHistory = (state: WithVolunteer) => state.volunteer.history.data;
export const selectAssignmentHistoryStatus = (state: WithVolunteer) => state.volunteer.history.status;
export const selectAssignmentHistoryError = (state: WithVolunteer) => state.volunteer.history.error;

export const selectFeedbacks = (state: WithVolunteer) => state.volunteer.feedbacks.data;
export const selectFeedbacksStatus = (state: WithVolunteer) => state.volunteer.feedbacks.status;
export const selectFeedbacksError = (state: WithVolunteer) => state.volunteer.feedbacks.error;
