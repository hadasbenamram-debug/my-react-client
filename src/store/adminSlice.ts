import {createSlice} from '@reduxjs/toolkit';
import type {PayloadAction} from '@reduxjs/toolkit';
import type {
    AdminDonationView,
    AdminNgoListItemView,
    AdminSupplierListItemView,
    AdminVolunteerListItemDto,
    AssignDonationResultDto,
    CommentDto,
    DashboardStatsDto,
    EngineRunResultDto,
    EngineStatusDto,
    ManualAssignDto,
    ManualAssignmentOptionsDto,
    MatchView,
    NoShowBoardDto,
    NoShowDto,
    PendingApprovalRequestDto,
    RequestedRoleName,
    RouteTrackingDto,
    SystemReportDto,
    SystemSettingsDto,
    TrackingPointDto,
    UpdateVerificationDto,
    UserDto,
    UserListItemView,
    VolunteerAvailabilityView,
} from '../types/api';
import type {RouteDecisionDto, RouteDecisionSummaryDto} from '../types/decisions';
import type {ApiErrorPayload} from '../api/http';
import {apiFetchRaw, apiRequest, toApiError, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * הנתונים של עמודי המנהל (Admin*Page) וה-thunks שלהם.
 * כל קריאה לשרת עוברת כאן דרך apiRequest. נתונים שעמוד טוען ומציג נשמרים ב-state (עם סטטוס ושגיאה),
 * ופעולות (אישור, מחיקה, שמירה, שיבוץ...) הן thunks שהעמוד מפעיל עם unwrap.
 * מצב ממשק מקומי (טפסים, דיאלוגים, "שומר...") נשאר ב-useState של העמוד.
 */

// ───────────────────────── טיפוסים ─────────────────────────

/** רשימה שנטענת מהשרת. items = null - עוד לא נטענה בהצלחה */
export interface AdminListState<T> {
    items: T[] | null;
    status: LoadStatus;
    error: string | null;
}

/** אובייקט יחיד שנטען מהשרת. item = null - עוד לא נטען בהצלחה */
export interface AdminItemState<T> {
    item: T | null;
    status: LoadStatus;
    error: string | null;
}

/** נתונים שתלויים בפרמטר (תפקיד / מסלול / תרומה) - שומרים לאיזה פרמטר הם שייכים ואיזו בקשה אחרונה */
interface KeyedState {
    key: string | null;
    requestId: string | null;
}

export interface AdminState {
    dashboardStats: AdminItemState<DashboardStatsDto>;
    approvals: AdminListState<PendingApprovalRequestDto> & {role: RequestedRoleName | null; requestId: string | null};
    users: AdminListState<UserListItemView> & {total: number | null};
    donations: AdminListState<AdminDonationView>;
    engineStatus: AdminItemState<EngineStatusDto>;
    engineDecisions: AdminListState<RouteDecisionSummaryDto>;
    decision: AdminItemState<RouteDecisionDto> & KeyedState;
    noShowBoard: AdminItemState<NoShowBoardDto>;
    assignCandidates: AdminItemState<ManualAssignmentOptionsDto> & KeyedState;
    reports: AdminItemState<SystemReportDto>;
    comments: AdminListState<CommentDto>;
    settings: AdminItemState<SystemSettingsDto>;
    availability: AdminListState<VolunteerAvailabilityView>;
    liveRoutes: AdminListState<RouteTrackingDto>;
    activeMatches: AdminListState<MatchView>;
    volunteers: AdminListState<AdminVolunteerListItemDto>;
    suppliers: AdminListState<AdminSupplierListItemView>;
    ngos: AdminListState<AdminNgoListItemView>;
}

/** תוצאה של סימון אי-הגעה / שיבוץ אוטומטי (השרת מחזיר הודעה, ולפעמים גוף ריק) */
export interface AdminActionMessage {
    matched?: boolean;
    message?: string;
}

/** רשימת המשתמשים + הסך הכולל מהכותרת X-Total-Count */
export interface AdminUsersPage {
    users: UserListItemView[];
    total: number | null;
}

const list = <T>(): AdminListState<T> => ({items: null, status: 'idle', error: null});
const item = <T>(): AdminItemState<T> => ({item: null, status: 'idle', error: null});

const initialState: AdminState = {
    dashboardStats: item(),
    approvals: {...list(), role: null, requestId: null},
    users: {...list(), total: null},
    donations: list(),
    engineStatus: item(),
    engineDecisions: list(),
    decision: {...item(), key: null, requestId: null},
    noShowBoard: item(),
    assignCandidates: {...item(), key: null, requestId: null},
    reports: item(),
    comments: list(),
    settings: item(),
    availability: list(),
    liveRoutes: list(),
    activeMatches: list(),
    volunteers: list(),
    suppliers: list(),
    ngos: list(),
};

// ───────────────────────── עזרים ─────────────────────────

const COMM_ERROR = 'שגיאת תקשורת מול השרת.';

/**
 * הופך שגיאה ל-payload של rejectWithValue.
 * network - הודעה אחרת כשאין תקשורת עם השרת (status 0), כמו שהעמוד הציג קודם.
 * fixed - הודעה קבועה שמחליפה את ההודעה מהשרת (עמודים שתמיד הציגו את אותה הודעה).
 */
const failure = (err: unknown, fallback: string, opts: {network?: string; fixed?: string} = {}): ApiErrorPayload => {
    const payload = toErrorPayload(err, fallback);
    if (payload.status === 0 && opts.network) return {...payload, message: opts.network};
    if (opts.fixed) return {...payload, message: opts.fixed};
    return payload;
};

interface Dataset {
    status: LoadStatus;
    error: string | null;
}

interface RejectedLike {
    payload?: ApiErrorPayload;
    error: {message?: string};
}

const loadStarted = (d: Dataset) => {
    d.status = 'loading';
};

const loadFailed = (d: Dataset, action: RejectedLike, fallback: string) => {
    d.status = 'failed';
    d.error = action.payload?.message ?? action.error.message ?? fallback;
};

// ───────────────────────── לוח בקרה ─────────────────────────

/** לוח הבקרה הניהולי: מספר התרומות הפתוחות, המתנדבים הזמינים, השיבוצים הפעילים והתראות No-Show */
export const fetchDashboardStats = createAppAsyncThunk<DashboardStatsDto>(
    'admin/fetchDashboardStats',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<DashboardStatsDto>('/api/admin/dashboard-stats', {fallbackMessage: 'שגיאה בטעינת הנתונים הניהוליים.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת הנתונים הניהוליים.'));
        }
    },
);

// ───────────────────────── אישורי משתמשים ─────────────────────────

/** בקשות ההרשמה שממתינות לאישור מנהל, לפי סוג המשתמש (מתנדב / ספק / עמותה) */
export const fetchPendingApprovals = createAppAsyncThunk<PendingApprovalRequestDto[], RequestedRoleName>(
    'admin/fetchPendingApprovals',
    async (role, {rejectWithValue}) => {
        try {
            return await apiRequest<PendingApprovalRequestDto[]>(`/api/approvalrequests/pending?role=${role}`, {fallbackMessage: 'שגיאה בטעינת הבקשות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת הבקשות.'));
        }
    },
);

/** אישור או דחייה של בקשת הרשמה. בדחייה נשלחת גם הסיבה (נשלחת למשתמש במייל) */
export const decideApprovalRequest = createAppAsyncThunk<void, {requestId: number; approve: boolean; reason?: string}>(
    'admin/decideApprovalRequest',
    async ({requestId, approve, reason}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/approvalrequests/${requestId}/${approve ? 'approve' : 'reject'}`, {
                method: 'POST',
                body: approve ? undefined : {reason},
                responseType: 'none',
                fallbackMessage: 'הפעולה נכשלה.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'הפעולה נכשלה.'));
        }
    },
);

// ───────────────────────── ניהול משתמשים ─────────────────────────

/** כל המשתמשים (עד 500). הסך הכולל מגיע בכותרת X-Total-Count, ולכן קוראים את התשובה הגולמית */
export const fetchAdminUsers = createAppAsyncThunk<AdminUsersPage>(
    'admin/fetchUsers',
    async (_, {rejectWithValue}) => {
        try {
            const res = await apiFetchRaw('/api/users?page=1&pageSize=500');
            if (!res.ok) throw await toApiError(res, 'שגיאה בטעינת משתמשים');
            const totalHeader = res.headers.get('X-Total-Count');
            const data = (await res.json()) as unknown;
            return {users: Array.isArray(data) ? (data as UserListItemView[]) : [], total: totalHeader ? Number(totalHeader) : null};
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת משתמשים'));
        }
    },
);

/** תיקון 51: המנהל מסמן ידנית שהמייל / הטלפון של משתמש אומת (או מבטל סימון) */
export const updateUserVerification = createAppAsyncThunk<UserDto, {userId: number; body: UpdateVerificationDto}>(
    'admin/updateUserVerification',
    async ({userId, body}, {rejectWithValue}) => {
        try {
            return await apiRequest<UserDto>(`/api/users/${userId}/verification`, {
                method: 'PUT',
                body,
                fallbackMessage: 'לא ניתן לעדכן את האימות כרגע.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'לא ניתן לעדכן את האימות כרגע.'));
        }
    },
);

/** תיקון 78: שחזור חשבון שהמשתמש מחק */
export const restoreUserAccount = createAppAsyncThunk<UserDto, number>(
    'admin/restoreUserAccount',
    async (userId, {rejectWithValue}) => {
        try {
            return await apiRequest<UserDto>(`/api/users/${userId}/restore`, {method: 'POST', fallbackMessage: 'לא ניתן לשחזר את החשבון כרגע.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'לא ניתן לשחזר את החשבון כרגע.'));
        }
    },
);

// ───────────────────────── ניהול תרומות ─────────────────────────

/** כל התרומות במערכת (לעמוד ניהול התרומות) */
export const fetchAdminDonations = createAppAsyncThunk<AdminDonationView[]>(
    'admin/fetchDonations',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminDonationView[]>('/api/donations', {fallbackMessage: 'שגיאה בטעינת תרומות'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת תרומות'));
        }
    },
);

/** ביטול תרומה בהתערבות מנהל (הסיבה נשלחת למתנדב אם כבר שובץ) */
export const cancelDonation = createAppAsyncThunk<void, {donationId: number; reason: string}>(
    'admin/cancelDonation',
    async ({donationId, reason}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/donations/${donationId}/cancel`, {
                method: 'PUT',
                body: {reason},
                responseType: 'none',
                fallbackMessage: 'שגיאה בעדכון התרומה.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בעדכון התרומה.'));
        }
    },
);

// ───────────────────────── מנוע השידוכים ─────────────────────────

const ENGINE_LOAD_ERROR = 'לא ניתן להתחבר לשרת או לטעון את נתוני המנוע. ודא שהשרת פועל.';

/** סטטוס המנוע: הריצה האחרונה בפועל + מספרים מהמסד */
export const fetchEngineStatus = createAppAsyncThunk<EngineStatusDto>(
    'admin/fetchEngineStatus',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<EngineStatusDto>('/api/matches/engine-status', {fallbackMessage: 'שגיאה בטעינת הנתונים מהשרת'});
        } catch (err) {
            console.error('שגיאה בטעינת סטטוס מנוע השידוכים:', err);
            // העמוד תמיד הציג את אותה הודעה
            return rejectWithValue(failure(err, ENGINE_LOAD_ERROR, {fixed: ENGINE_LOAD_ERROR}));
        }
    },
);

/** תיקון 75: ההחלטות האחרונות של המנוע (כל אחת עם הסבר "למה") */
export const fetchEngineDecisions = createAppAsyncThunk<RouteDecisionSummaryDto[]>(
    'admin/fetchEngineDecisions',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<RouteDecisionSummaryDto[]>('/api/matches/decisions?take=12', {fallbackMessage: 'שגיאה בטעינת ההחלטות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת ההחלטות.'));
        }
    },
);

/** הפעלה ידנית של המנוע. 409 = ריצה אחרת פעילה כרגע (השרת מחזיר את אותו מבנה עם started=false) */
export const runMatchingEngine = createAppAsyncThunk<EngineRunResultDto>(
    'admin/runMatchingEngine',
    async (_, {rejectWithValue}) => {
        try {
            const res = await apiFetchRaw('/api/matches/run-engine', {method: 'POST'});
            if (!res.ok && res.status !== 409) throw await toApiError(res, 'שגיאה בהפעלת מנוע השידוכים בשרת.');
            return (await res.json()) as EngineRunResultDto;
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בהפעלת מנוע השידוכים.'));
        }
    },
);

/** תיקון 75: ההסבר להחלטה של מסלול. לפי תרומה - קודם מוצאים את המסלול שלה */
export const fetchRouteDecision = createAppAsyncThunk<RouteDecisionDto, {routeId?: string; donationId?: string}>(
    'admin/fetchRouteDecision',
    async ({routeId, donationId}, {rejectWithValue, signal}) => {
        try {
            let id = Number(routeId);
            if (!routeId && donationId) {
                const lookup = await apiRequest<{routeId: number}>(`/api/matches/decisions/by-donation/${donationId}`, {
                    fallbackMessage: 'לא נמצא הסבר לתרומה הזו.',
                    signal,
                });
                id = lookup.routeId;
            }
            return await apiRequest<RouteDecisionDto>(`/api/matches/decisions/${id}`, {fallbackMessage: 'לא הצלחנו לטעון את ההסבר.', signal});
        } catch (err) {
            return rejectWithValue(failure(err, COMM_ERROR));
        }
    },
);

/** המפתח של ההחלטה המוצגת (כדי לא להציג החלטה של מסלול אחר) */
export const decisionKey = (routeId?: string, donationId?: string) => `${routeId ?? ''}|${donationId ?? ''}`;

// ───────────────────────── אי-הגעה (No-Show) ─────────────────────────

/** תיקון 36: הלוח - מי ממתין לאיסוף (ובכמה הוא מאחר) ואילו תרומות סומנו No-Show */
export const fetchNoShowBoard = createAppAsyncThunk<NoShowBoardDto>(
    'admin/fetchNoShowBoard',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<NoShowBoardDto>('/api/matches/no-show/board', {fallbackMessage: 'לא ניתן לטעון את נתוני אי-ההגעה.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'לא ניתן לטעון את נתוני אי-ההגעה.', {network: COMM_ERROR}));
        }
    },
);

/** סימון אי-הגעה של מסלול: שיבוץ אוטומטי מחדש, או שהמנהל ישבץ בעצמו */
export const markNoShow = createAppAsyncThunk<AdminActionMessage | null, {matchId: number; body: NoShowDto}>(
    'admin/markNoShow',
    async ({matchId, body}, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminActionMessage | null>(`/api/matches/${matchId}/no-show`, {
                method: 'POST',
                body,
                fallbackMessage: 'הסימון נכשל.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'הסימון נכשל.', {network: COMM_ERROR}));
        }
    },
);

/** שיבוץ אוטומטי מיידי של תרומה (אחרי No-Show) */
export const autoReassignDonation = createAppAsyncThunk<AdminActionMessage | null, number>(
    'admin/autoReassignDonation',
    async (donationId, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminActionMessage | null>(`/api/matches/assign-donation/${donationId}`, {
                method: 'POST',
                fallbackMessage: 'הפעולה נכשלה.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'הפעולה נכשלה.', {network: COMM_ERROR}));
        }
    },
);

// ───────────────────────── שיבוץ ידני ─────────────────────────

/** תיקון 36: המתנדבים שאפשר לשבץ לתרומה, המתאימים ביותר ראשונים */
export const fetchAssignCandidates = createAppAsyncThunk<ManualAssignmentOptionsDto, number>(
    'admin/fetchAssignCandidates',
    async (donationId, {rejectWithValue, signal}) => {
        try {
            return await apiRequest<ManualAssignmentOptionsDto>(`/api/matches/assign-donation/${donationId}/candidates`, {
                fallbackMessage: 'לא ניתן לטעון את רשימת המתנדבים.',
                signal,
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'לא ניתן לטעון את רשימת המתנדבים.'));
        }
    },
);

/** שיבוץ התרומה למתנדב שהמנהל בחר (המתנדב מקבל הצעה רגילה) */
export const assignDonationToVolunteer = createAppAsyncThunk<AssignDonationResultDto, {donationId: number; volunteerId: number; body: ManualAssignDto}>(
    'admin/assignDonationToVolunteer',
    async ({donationId, volunteerId, body}, {rejectWithValue}) => {
        try {
            return await apiRequest<AssignDonationResultDto>(`/api/matches/assign-donation/${donationId}/volunteer/${volunteerId}`, {
                method: 'POST',
                body,
                fallbackMessage: 'השיבוץ נכשל.',
            });
        } catch (err) {
            return rejectWithValue(failure(err, 'השיבוץ נכשל.', {network: COMM_ERROR}));
        }
    },
);

// ───────────────────────── דוחות ─────────────────────────

const REPORTS_ERROR = 'לא הצלחנו לטעון את הדוחות. נא לרענן את הדף.';

/** תיקון 17: דוחות וסטטיסטיקות מחושבים מהנתונים בפועל */
export const fetchSystemReports = createAppAsyncThunk<SystemReportDto>(
    'admin/fetchSystemReports',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<SystemReportDto>('/api/admin/volunteers/reports', {fallbackMessage: REPORTS_ERROR});
        } catch (err) {
            return rejectWithValue(failure(err, REPORTS_ERROR, {network: 'לא הצלחנו לטעון את הדוחות. נא לבדוק את החיבור ולרענן את הדף.'}));
        }
    },
);

// ───────────────────────── תגובות ─────────────────────────

/** כל התגובות במערכת */
export const fetchAdminComments = createAppAsyncThunk<CommentDto[]>(
    'admin/fetchComments',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<CommentDto[]>('/api/comments', {fallbackMessage: 'שגיאה בטעינת התגובות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת התגובות.'));
        }
    },
);

/** מחיקת תגובה (השרת מוחק גם את כל התשובות שמתחתיה) */
export const deleteAdminComment = createAppAsyncThunk<void, number>(
    'admin/deleteComment',
    async (commentId, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/comments/${commentId}`, {method: 'DELETE', responseType: 'none', fallbackMessage: 'שגיאה במחיקת התגובה.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה במחיקת התגובה.'));
        }
    },
);

// ───────────────────────── הגדרות מערכת ─────────────────────────

/** הגדרות מנוע השידוכים (נשמרות במסד) */
export const fetchSystemSettings = createAppAsyncThunk<SystemSettingsDto>(
    'admin/fetchSystemSettings',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<SystemSettingsDto>('/api/settings', {fallbackMessage: 'שגיאה בטעינת ההגדרות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת ההגדרות.'));
        }
    },
);

/** שמירת ההגדרות - חלות מהריצה הבאה של המנוע. השרת מחזיר את ההגדרות השמורות */
export const saveSystemSettings = createAppAsyncThunk<SystemSettingsDto, SystemSettingsDto>(
    'admin/saveSystemSettings',
    async (settings, {rejectWithValue}) => {
        try {
            return await apiRequest<SystemSettingsDto>('/api/settings', {method: 'PUT', body: settings, fallbackMessage: 'שגיאה בשמירת ההגדרות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בשמירת ההגדרות.'));
        }
    },
);

// ───────────────────────── ספריות ─────────────────────────

/** הזמינות השבועית של כל המתנדבים */
export const fetchVolunteersAvailability = createAppAsyncThunk<VolunteerAvailabilityView[]>(
    'admin/fetchVolunteersAvailability',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<VolunteerAvailabilityView[]>('/api/admin/volunteers/availability', {fallbackMessage: 'שגיאה בטעינת זמינות מתנדבים.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת זמינות מתנדבים.'));
        }
    },
);

/** תיקון 62: כל המתנדבים (סטטוס אישור, זמינות, רכב, רישיון ואמינות) */
export const fetchAdminVolunteers = createAppAsyncThunk<AdminVolunteerListItemDto[]>(
    'admin/fetchVolunteers',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminVolunteerListItemDto[]>('/api/volunteers', {fallbackMessage: 'שגיאה בטעינת המתנדבים.'});
        } catch (err) {
            console.error('שגיאה בטעינת מתנדבים:', err);
            return rejectWithValue(failure(err, 'שגיאה בטעינת המתנדבים.', {fixed: 'שגיאה בטעינת המתנדבים.'}));
        }
    },
);

/** כל הספקים והתורמים */
export const fetchAdminSuppliers = createAppAsyncThunk<AdminSupplierListItemView[]>(
    'admin/fetchSuppliers',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminSupplierListItemView[]>('/api/admin/suppliers', {fallbackMessage: 'שגיאה בטעינת ספקים.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת ספקים.'));
        }
    },
);

/** כל העמותות */
export const fetchAdminNgos = createAppAsyncThunk<AdminNgoListItemView[]>(
    'admin/fetchNgos',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<AdminNgoListItemView[]>('/api/admin/ngos', {fallbackMessage: 'שגיאה בטעינת עמותות.'});
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת עמותות.'));
        }
    },
);

/**
 * קובץ רישיון העסק של ספק (לא בכתובת ציבורית - צריך את הטוקן).
 * מחזיר כתובת blob: (מחרוזת, כדי שהפעולה תישאר ניתנת לשמירה ב-Redux). מי שקורא צריך לשחרר אותה עם revokeObjectURL.
 */
export const fetchSupplierLicenseUrl = createAppAsyncThunk<string, number>(
    'admin/fetchSupplierLicenseUrl',
    async (supplierId, {rejectWithValue}) => {
        try {
            const blob = await apiRequest<Blob>(`/api/admin/suppliers/${supplierId}/license`, {responseType: 'blob'});
            return URL.createObjectURL(blob);
        } catch (err) {
            const payload = toErrorPayload(err, 'שגיאה בפתיחת קובץ הרישיון.');
            // אותן הודעות כמו קודם: 404 = אין קובץ, אין תקשורת, וכל שגיאה אחרת
            const message = payload.status === 0 ? 'שגיאת תקשורת מול השרת.'
                : payload.status === 404 ? 'לא נמצא קובץ רישיון עבור ספק זה.'
                    : 'שגיאה בפתיחת קובץ הרישיון.';
            return rejectWithValue({...payload, message});
        }
    },
);

// ───────────────────────── חדר הבקרה (מפה חיה) ─────────────────────────

/** כל המסלולים שבדרך, עם המיקום, השובל והאירועים (ממוינים לפי מספר המסלול) */
export const fetchLiveRoutes = createAppAsyncThunk<RouteTrackingDto[]>(
    'admin/fetchLiveRoutes',
    async (_, {rejectWithValue}) => {
        try {
            const data = await apiRequest<RouteTrackingDto[]>('/api/tracking/live', {fallbackMessage: 'לא ניתן לטעון את המסלולים כרגע.'});
            return [...data].sort((a, b) => a.route.id - b.route.id);
        } catch (err) {
            return rejectWithValue(failure(err, 'לא ניתן לטעון את המסלולים כרגע.', {network: 'לא ניתן לטעון את המסלולים כרגע.'}));
        }
    },
);

/** תיקון 63: השיבוצים הפעילים (כדי להציג את אלה שעוד לא יצאו לדרך). כישלון לא מציג שגיאה */
export const fetchActiveMatches = createAppAsyncThunk<MatchView[]>(
    'admin/fetchActiveMatches',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<MatchView[]>('/api/matches/active');
        } catch (err) {
            return rejectWithValue(failure(err, 'שגיאה בטעינת השיבוצים הפעילים.'));
        }
    },
);

// ───────────────────────── הסלייס ─────────────────────────

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        /** מיקום חדש של מתנדב בזמן אמת (SignalR) - מוסיפים לשובל של המסלול שלו */
        liveRoutePositionReceived(state, action: PayloadAction<{routeId: number; point: TrackingPointDto}>) {
            const {routeId, point} = action.payload;
            const t = state.liveRoutes.items?.find((r) => r.route.id === routeId);
            if (!t) return;
            const last = t.trail[t.trail.length - 1];
            if (!last || last.at !== point.at) t.trail.push(point);
            t.currentPosition = point;
        },
    },
    extraReducers: (builder) => {
        builder
            // לוח בקרה
            .addCase(fetchDashboardStats.pending, (state) => loadStarted(state.dashboardStats))
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.dashboardStats = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => loadFailed(state.dashboardStats, action, 'שגיאה בטעינת הנתונים הניהוליים.'))

            // אישורי משתמשים - רק התשובה לבקשה האחרונה (מעבר מהיר בין לשוניות)
            .addCase(fetchPendingApprovals.pending, (state, action) => {
                state.approvals.status = 'loading';
                state.approvals.error = null;
                state.approvals.role = action.meta.arg;
                state.approvals.requestId = action.meta.requestId;
            })
            .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
                if (state.approvals.requestId !== action.meta.requestId) return;
                state.approvals.items = action.payload;
                state.approvals.status = 'succeeded';
            })
            .addCase(fetchPendingApprovals.rejected, (state, action) => {
                if (state.approvals.requestId !== action.meta.requestId) return;
                loadFailed(state.approvals, action, 'שגיאה בטעינת הבקשות.');
            })

            // משתמשים
            .addCase(fetchAdminUsers.pending, (state) => loadStarted(state.users))
            .addCase(fetchAdminUsers.fulfilled, (state, action) => {
                state.users.items = action.payload.users;
                state.users.total = action.payload.total;
                state.users.status = 'succeeded';
                state.users.error = null;
            })
            .addCase(fetchAdminUsers.rejected, (state, action) => loadFailed(state.users, action, 'שגיאה בטעינת משתמשים'))
            .addCase(updateUserVerification.fulfilled, (state, action) => {
                const updated = action.payload;
                const u = state.users.items?.find((x) => x.id === updated.id);
                if (u) {
                    u.isEmailVerified = updated.isEmailVerified;
                    u.isPhoneVerified = updated.isPhoneVerified;
                }
            })
            .addCase(restoreUserAccount.fulfilled, (state, action) => {
                const updated = action.payload;
                const u = state.users.items?.find((x) => x.id === updated.id);
                if (u) {
                    u.isActive = updated.isActive;
                    u.deactivatedAt = updated.deactivatedAt;
                }
            })

            // תרומות
            .addCase(fetchAdminDonations.pending, (state) => loadStarted(state.donations))
            .addCase(fetchAdminDonations.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.donations.items = action.payload;
                state.donations.status = 'succeeded';
                state.donations.error = null;
            })
            .addCase(fetchAdminDonations.rejected, (state, action) => loadFailed(state.donations, action, 'שגיאה בטעינת תרומות'))

            // מנוע השידוכים
            .addCase(fetchEngineStatus.pending, (state) => loadStarted(state.engineStatus))
            .addCase(fetchEngineStatus.fulfilled, (state, action) => {
                state.engineStatus = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchEngineStatus.rejected, (state, action) => loadFailed(state.engineStatus, action, ENGINE_LOAD_ERROR))
            .addCase(fetchEngineDecisions.pending, (state) => loadStarted(state.engineDecisions))
            .addCase(fetchEngineDecisions.fulfilled, (state, action) => {
                state.engineDecisions = {items: action.payload, status: 'succeeded', error: null};
            })
            // כמו קודם: כישלון = רשימה ריקה
            .addCase(fetchEngineDecisions.rejected, (state, action) => {
                loadFailed(state.engineDecisions, action, 'שגיאה בטעינת ההחלטות.');
                state.engineDecisions.items = [];
            })

            // הסבר להחלטה
            .addCase(fetchRouteDecision.pending, (state, action) => {
                state.decision = {
                    item: null,
                    status: 'loading',
                    error: null,
                    key: decisionKey(action.meta.arg.routeId, action.meta.arg.donationId),
                    requestId: action.meta.requestId,
                };
            })
            .addCase(fetchRouteDecision.fulfilled, (state, action) => {
                if (state.decision.requestId !== action.meta.requestId) return;
                state.decision.item = action.payload;
                state.decision.status = 'succeeded';
            })
            .addCase(fetchRouteDecision.rejected, (state, action) => {
                if (state.decision.requestId !== action.meta.requestId) return;
                if (action.meta.aborted) {
                    state.decision.status = 'idle';
                    return;
                }
                loadFailed(state.decision, action, COMM_ERROR);
            })

            // אי-הגעה (רענון שקט - השגיאה הקודמת נשארת עד הצלחה)
            .addCase(fetchNoShowBoard.pending, (state) => loadStarted(state.noShowBoard))
            .addCase(fetchNoShowBoard.fulfilled, (state, action) => {
                state.noShowBoard = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchNoShowBoard.rejected, (state, action) => loadFailed(state.noShowBoard, action, 'לא ניתן לטעון את נתוני אי-ההגעה.'))

            // מועמדים לשיבוץ ידני
            .addCase(fetchAssignCandidates.pending, (state, action) => {
                state.assignCandidates = {
                    item: null,
                    status: 'loading',
                    error: null,
                    key: String(action.meta.arg),
                    requestId: action.meta.requestId,
                };
            })
            .addCase(fetchAssignCandidates.fulfilled, (state, action) => {
                if (state.assignCandidates.requestId !== action.meta.requestId) return;
                state.assignCandidates.item = action.payload;
                state.assignCandidates.status = 'succeeded';
            })
            .addCase(fetchAssignCandidates.rejected, (state, action) => {
                if (state.assignCandidates.requestId !== action.meta.requestId) return;
                if (action.meta.aborted) {
                    state.assignCandidates.status = 'idle';
                    return;
                }
                loadFailed(state.assignCandidates, action, 'לא ניתן לטעון את רשימת המתנדבים.');
            })

            // דוחות
            .addCase(fetchSystemReports.pending, (state) => loadStarted(state.reports))
            .addCase(fetchSystemReports.fulfilled, (state, action) => {
                state.reports = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchSystemReports.rejected, (state, action) => loadFailed(state.reports, action, REPORTS_ERROR))

            // תגובות
            .addCase(fetchAdminComments.pending, (state) => loadStarted(state.comments))
            .addCase(fetchAdminComments.fulfilled, (state, action) => {
                state.comments = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchAdminComments.rejected, (state, action) => loadFailed(state.comments, action, 'שגיאה בטעינת התגובות.'))

            // הגדרות
            .addCase(fetchSystemSettings.pending, (state) => loadStarted(state.settings))
            .addCase(fetchSystemSettings.fulfilled, (state, action) => {
                state.settings = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchSystemSettings.rejected, (state, action) => loadFailed(state.settings, action, 'שגיאה בטעינת ההגדרות.'))
            .addCase(saveSystemSettings.fulfilled, (state, action) => {
                state.settings.item = action.payload;
            })

            // זמינות מתנדבים
            .addCase(fetchVolunteersAvailability.pending, (state) => loadStarted(state.availability))
            .addCase(fetchVolunteersAvailability.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.availability.items = action.payload;
                state.availability.status = 'succeeded';
                state.availability.error = null;
            })
            .addCase(fetchVolunteersAvailability.rejected, (state, action) => loadFailed(state.availability, action, 'שגיאה בטעינת זמינות מתנדבים.'))

            // ספריות
            .addCase(fetchAdminVolunteers.pending, (state) => loadStarted(state.volunteers))
            .addCase(fetchAdminVolunteers.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.volunteers.items = action.payload;
                state.volunteers.status = 'succeeded';
                state.volunteers.error = null;
            })
            .addCase(fetchAdminVolunteers.rejected, (state, action) => loadFailed(state.volunteers, action, 'שגיאה בטעינת המתנדבים.'))
            .addCase(fetchAdminSuppliers.pending, (state) => loadStarted(state.suppliers))
            .addCase(fetchAdminSuppliers.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.suppliers.items = action.payload;
                state.suppliers.status = 'succeeded';
                state.suppliers.error = null;
            })
            .addCase(fetchAdminSuppliers.rejected, (state, action) => loadFailed(state.suppliers, action, 'שגיאה בטעינת ספקים.'))
            .addCase(fetchAdminNgos.pending, (state) => loadStarted(state.ngos))
            .addCase(fetchAdminNgos.fulfilled, (state, action) => {
                if (Array.isArray(action.payload)) state.ngos.items = action.payload;
                state.ngos.status = 'succeeded';
                state.ngos.error = null;
            })
            .addCase(fetchAdminNgos.rejected, (state, action) => loadFailed(state.ngos, action, 'שגיאה בטעינת עמותות.'))

            // חדר הבקרה
            .addCase(fetchLiveRoutes.pending, (state) => loadStarted(state.liveRoutes))
            .addCase(fetchLiveRoutes.fulfilled, (state, action) => {
                state.liveRoutes = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchLiveRoutes.rejected, (state, action) => loadFailed(state.liveRoutes, action, 'לא ניתן לטעון את המסלולים כרגע.'))
            .addCase(fetchActiveMatches.pending, (state) => loadStarted(state.activeMatches))
            .addCase(fetchActiveMatches.fulfilled, (state, action) => {
                state.activeMatches = {items: action.payload, status: 'succeeded', error: null};
            })
            // חלק משני - נשארת הרשימה הקודמת
            .addCase(fetchActiveMatches.rejected, (state, action) => loadFailed(state.activeMatches, action, 'שגיאה בטעינת השיבוצים הפעילים.'))

            // יציאה מהמערכת - לא משאירים נתונים של המנהל הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export const {liveRoutePositionReceived} = adminSlice.actions;
export default adminSlice.reducer;

// ───────────────────────── selectors ─────────────────────────

type WithAdmin = {admin: AdminState};

export const selectDashboardStats = (state: WithAdmin) => state.admin.dashboardStats;
export const selectPendingApprovals = (state: WithAdmin) => state.admin.approvals;
export const selectAdminUsers = (state: WithAdmin) => state.admin.users;
export const selectAdminDonations = (state: WithAdmin) => state.admin.donations;
export const selectEngineStatus = (state: WithAdmin) => state.admin.engineStatus;
export const selectEngineDecisions = (state: WithAdmin) => state.admin.engineDecisions;
export const selectRouteDecision = (state: WithAdmin) => state.admin.decision;
export const selectNoShowBoard = (state: WithAdmin) => state.admin.noShowBoard;
export const selectAssignCandidates = (state: WithAdmin) => state.admin.assignCandidates;
export const selectSystemReports = (state: WithAdmin) => state.admin.reports;
export const selectAdminComments = (state: WithAdmin) => state.admin.comments;
export const selectSystemSettings = (state: WithAdmin) => state.admin.settings;
export const selectVolunteersAvailability = (state: WithAdmin) => state.admin.availability;
export const selectAdminVolunteers = (state: WithAdmin) => state.admin.volunteers;
export const selectAdminSuppliers = (state: WithAdmin) => state.admin.suppliers;
export const selectAdminNgos = (state: WithAdmin) => state.admin.ngos;
export const selectLiveRoutes = (state: WithAdmin) => state.admin.liveRoutes;
export const selectActiveMatches = (state: WithAdmin) => state.admin.activeMatches;

/** טעינה ראשונה: עוד אין נתונים ועוד לא נכשלה (רענון ברקע לא מחזיר את הספינר) */
export const isFirstLoad = (d: {status: LoadStatus; error: string | null}, hasData: boolean) =>
    !hasData && (d.status === 'idle' || d.status === 'loading');
