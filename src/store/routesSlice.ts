import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {
    BrowserMapConfigDto,
    DeliveryLogResponseDto,
    MapEntityView,
    RouteTrackingDto,
    TrackingPointDto,
} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * מסלולים ומפות: מעקב חי אחרי מסלול, המפה הכללית של כל הישויות, הגדרות המפה האינטראקטיבית
 * ותמונות מפה מהשרת. כל הקריאות לשרת - ב-thunks שכאן.
 * חיבורי ה-SignalR נשארים ב-hooks (useRouteLive / useAllRoutesLive) - הדף מעביר לכאן את העדכונים.
 */

/** מעקב חי אחרי מסלול אחד (/app/track/:routeId) */
export interface TrackingState {
    /** לאיזה מסלול שייכים הנתונים */
    routeId: number | null;
    data: RouteTrackingDto | null;
    /** מסלול הנסיעה - מתעדכן גם מ-SignalR בין הטעינות */
    trail: TrackingPointDto[];
    /** האירועים במסלול - מתעדכנים גם מ-SignalR */
    events: DeliveryLogResponseDto[];
    current: TrackingPointDto | null;
    /** 404 - המסלול לא נמצא או שאין הרשאה */
    notFound: boolean;
    status: LoadStatus;
    error: string | null;
}

export interface RoutesState {
    tracking: TrackingState;
    /** כל הישויות על המפה הכללית */
    mapEntities: {data: MapEntityView[]; status: LoadStatus; error: string | null};
    /** הגדרות המפה האינטראקטיבית. נטענות פעם אחת לכל האפליקציה (failed = מנסים שוב בפעם הבאה) */
    mapConfig: {data: BrowserMapConfigDto | null; status: LoadStatus};
}

const initialTracking: TrackingState = {
    routeId: null,
    data: null,
    trail: [],
    events: [],
    current: null,
    notFound: false,
    status: 'idle',
    error: null,
};

const initialState: RoutesState = {
    tracking: initialTracking,
    mapEntities: {data: [], status: 'idle', error: null},
    mapConfig: {data: null, status: 'idle'},
};

// ───────────────────────── מעקב חי ─────────────────────────

/** נתוני המעקב של מסלול (api/tracking/routes/{id}): המסלול, הדרך שנסע, האירועים וזמן ההגעה */
export const fetchRouteTracking = createAppAsyncThunk<RouteTrackingDto, number>(
    'routes/fetchTracking',
    async (routeId, {rejectWithValue}) => {
        try {
            return await apiRequest<RouteTrackingDto>(`/api/tracking/routes/${routeId}`);
        } catch (err) {
            const payload = toErrorPayload(err, 'לא ניתן לטעון את המעקב כרגע.');
            // אין תקשורת עם השרת - אותה הודעה קבועה כמו קודם
            return rejectWithValue(payload.status === 0 ? {...payload, message: 'לא ניתן לטעון את המעקב כרגע.'} : payload);
        }
    },
);

// ───────────────────────── המפה הכללית ─────────────────────────

/** כל התורמים, העמותות והמתנדבים למפה הכללית */
export const fetchMapEntities = createAppAsyncThunk<MapEntityView[]>(
    'routes/fetchMapEntities',
    async (_, {rejectWithValue}) => {
        try {
            const data = await apiRequest<MapEntityView[]>('/api/map/all-entities');
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.error('שגיאה בטעינת נתוני מפה:', err);
            return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינת נתוני מפה.'));
        }
    },
);

// ───────────────────────── הגדרות המפה האינטראקטיבית ─────────────────────────

/**
 * הגדרות מפתח הדפדפן של Google Maps (api/map/browser-config - רק למשתמש מחובר).
 * נטענות פעם אחת לכל האפליקציה: condition מדלג כשכבר נטענו או שהטעינה באמצע.
 * null = אין מפה אינטראקטיבית (מציגים תמונה מהשרת). תקלה זמנית - בפעם הבאה מנסים שוב.
 */
export const fetchBrowserMapConfig = createAppAsyncThunk<BrowserMapConfigDto | null>(
    'routes/fetchBrowserMapConfig',
    async () => {
        try {
            return await apiRequest<BrowserMapConfigDto | null>('/api/map/browser-config');
        } catch {
            return null;
        }
    },
    {
        condition: (_, {getState}) => {
            const {status, data} = getState().routes.mapConfig;
            return status !== 'loading' && !(status === 'succeeded' && data);
        },
    },
);

// ───────────────────────── תמונת מפה מהשרת ─────────────────────────

/**
 * תמונת מפה מהשרת עם הטוקן (תגית img לא יכולה לשלוח כותרת Authorization).
 * מחזיר כתובת object URL (מחרוזת - נשמרת ב-state של הרכיב). מי שקורא אחראי לשחרר אותה (URL.revokeObjectURL).
 */
export const fetchMapImage = createAppAsyncThunk<string, string>(
    'routes/fetchMapImage',
    async (src, {rejectWithValue}) => {
        try {
            const blob = await apiRequest<Blob>(src, {responseType: 'blob', fallbackMessage: 'לא ניתן להציג את המפה כרגע.'});
            return URL.createObjectURL(blob);
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן להציג את המפה כרגע.'));
        }
    },
);

// ───────────────────────── הסלייס ─────────────────────────

const routesSlice = createSlice({
    name: 'routes',
    initialState,
    reducers: {
        /** SignalR: עדכון מיקום של המתנדב במסלול שבמעקב */
        trackingLocationReceived(state, action: PayloadAction<TrackingPointDto>) {
            const point = action.payload;
            const trail = state.tracking.trail;
            if (!(trail.length > 0 && trail[trail.length - 1].at === point.at)) trail.push(point);
            state.tracking.current = point;
        },
        /** SignalR: אירוע חדש ביומן המשלוח (איסוף, מסירה...) */
        trackingEventReceived(state, action: PayloadAction<DeliveryLogResponseDto>) {
            if (!state.tracking.events.some((e) => e.id === action.payload.id)) state.tracking.events.push(action.payload);
        },
        /** אין מזהה מסלול תקין בכתובת */
        trackingNotFound(state, action: PayloadAction<number>) {
            state.tracking = {...initialTracking, routeId: action.payload, notFound: true, status: 'failed'};
        },
    },
    extraReducers: (builder) => {
        builder
            // מעקב חי - מסלול אחר מתחיל מאפס; רענון של אותו מסלול לא מחליף את הדף בסמל טעינה
            .addCase(fetchRouteTracking.pending, (state, action) => {
                if (state.tracking.routeId !== action.meta.arg) {
                    state.tracking = {...initialTracking, routeId: action.meta.arg, status: 'loading'};
                }
            })
            .addCase(fetchRouteTracking.fulfilled, (state, action) => {
                // תשובה מאוחרת של מסלול קודם - לא דורסת את המסלול שבמעקב עכשיו
                if (state.tracking.routeId !== action.meta.arg) return;
                const data = action.payload;
                state.tracking = {
                    routeId: action.meta.arg,
                    data,
                    trail: data.trail,
                    events: data.events,
                    current: data.currentPosition,
                    notFound: false,
                    status: 'succeeded',
                    error: null,
                };
            })
            .addCase(fetchRouteTracking.rejected, (state, action) => {
                if (state.tracking.routeId !== action.meta.arg) return;
                state.tracking.status = 'failed';
                if (action.payload?.status === 404) state.tracking.notFound = true;
                else state.tracking.error = action.payload?.message ?? 'לא ניתן לטעון את המעקב כרגע.';
            })

            // המפה הכללית
            .addCase(fetchMapEntities.pending, (state) => {
                state.mapEntities.status = 'loading';
                state.mapEntities.error = null;
            })
            .addCase(fetchMapEntities.fulfilled, (state, action) => {
                state.mapEntities = {data: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchMapEntities.rejected, (state, action) => {
                state.mapEntities.status = 'failed';
                state.mapEntities.error = action.payload?.message ?? null;
            })

            // הגדרות המפה
            .addCase(fetchBrowserMapConfig.pending, (state) => {
                state.mapConfig.status = 'loading';
            })
            .addCase(fetchBrowserMapConfig.fulfilled, (state, action) => {
                state.mapConfig = {data: action.payload, status: action.payload ? 'succeeded' : 'failed'};
            })

            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export const {trackingLocationReceived, trackingEventReceived, trackingNotFound} = routesSlice.actions;
export default routesSlice.reducer;

// ───────────────────────── selectors ─────────────────────────

type WithRoutes = {routes: RoutesState};

export const selectTracking = (state: WithRoutes) => state.routes.tracking;

export const selectMapEntities = (state: WithRoutes) => state.routes.mapEntities.data;
export const selectMapEntitiesStatus = (state: WithRoutes) => state.routes.mapEntities.status;

/** undefined = עוד טוען, null = אין מפה אינטראקטיבית, אחרת ההגדרות */
export const selectBrowserMapConfig = (state: WithRoutes): BrowserMapConfigDto | null | undefined => {
    const {status, data} = state.routes.mapConfig;
    if (status === 'idle' || status === 'loading') return undefined;
    return status === 'succeeded' ? data : null;
};
