import {createSlice} from '@reduxjs/toolkit';
import type {
    ActionResultBody,
    CreateFeedbackDto,
    NgoDonationView,
    NgoResponseDto,
    RegionResponseDto,
    UpdateNgoHoursDto,
} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * עמותה: התרומות של העמותה (דשבורד והיסטוריה), פרטי העמותה המחוברת (שעות קבלה, קיבולת),
 * שמירת שעות הקבלה, הרשמת עמותה ודירוג מסירה.
 */

/** גוף בקשת הרשמת עמותה. פרטי המשתמש (name / email / phone) נשלחים רק בהרשמה חדשה */
export interface NgoRegistrationBody {
    name?: string;
    email?: string;
    phone?: string;
    ngoName: string;
    registrationNumber: string;
    address: string;
    dailyCapacity: number;
    regionId: number;
    sunToThuOpenTime: string;
    sunToThuCloseTime: string;
    receivesOnFriday: boolean;
    fridayOpenTime: string | null;
    fridayCloseTime: string | null;
    receivesOnSaturdayNight: boolean;
    saturdayNightOpenTime: string | null;
    saturdayNightCloseTime: string | null;
}

export interface NgoState {
    /** התרומות ששובצו לעמותה - כל דף מסנן לפי הסטטוסים שלו */
    donations: {items: NgoDonationView[] | null; status: LoadStatus; error: string | null};
    /** פרטי העמותה המחוברת (שעות קבלה, כתובת, קיבולת יומית) */
    profile: {item: NgoResponseDto | null; status: LoadStatus; error: string | null};
    /** האזורים (להרשמה - השדה עדיין חובה ב-DTO) */
    regions: {items: RegionResponseDto[] | null; status: LoadStatus; error: string | null};
}

const initialState: NgoState = {
    donations: {items: null, status: 'idle', error: null},
    profile: {item: null, status: 'idle', error: null},
    regions: {items: null, status: 'idle', error: null},
};

/** התרומות של העמותה המחוברת (השידוך האחרון לכל תרומה) */
export const fetchNgoDonations = createAppAsyncThunk<NgoDonationView[]>(
    'ngo/fetchDonations',
    async (_, {rejectWithValue}) => {
        try {
            // בלי הודעה מהשרת - מציגים את קוד השגיאה (כמו קודם)
            const data = await apiRequest<NgoDonationView[] | null>('/api/donations/my-ngo-donations', {fallbackMessage: ''});
            return Array.isArray(data) ? data : [];
        } catch (err) {
            const payload = toErrorPayload(err, 'שגיאה בטעינת נתוני העמותה.');
            return rejectWithValue(payload.message ? payload : {...payload, message: `שגיאה בשרת: ${payload.status}`});
        }
    },
);

/** פרטי העמותה המחוברת (שעות הקבלה, המיקום והקיבולת) */
export const fetchNgoProfile = createAppAsyncThunk<NgoResponseDto>(
    'ngo/fetchProfile',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<NgoResponseDto>('/api/ngos/me');
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינת פרטי העמותה.'));
        }
    },
);

/** רשימת האזורים (פתוחה לכולם - בלי טוקן) */
export const fetchRegions = createAppAsyncThunk<RegionResponseDto[]>(
    'ngo/fetchRegions',
    async (_, {rejectWithValue}) => {
        try {
            const data = await apiRequest<RegionResponseDto[] | null>('/api/region', {auth: false});
            return Array.isArray(data) ? data : [];
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינת אזורים.'));
        }
    },
);

/** שמירת שעות הקבלה והכתובת של העמותה (המיקום המדויק נקבע בשרת לפי הכתובת) */
export const saveNgoHours = createAppAsyncThunk<void, UpdateNgoHoursDto>(
    'ngo/saveHours',
    async (payload, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/ngos/my-hours', {
                method: 'PUT',
                body: payload,
                fallbackMessage: 'שגיאה בעדכון הנתונים מול השרת.',
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בעדכון הנתונים מול השרת.'));
        }
    },
);

/** הרשמת עמותה. מחוברים: התפקיד מצורף לחשבון הקיים (POST api/ngos), אחרת - הרשמה חדשה בלי טוקן */
export const registerNgo = createAppAsyncThunk<ActionResultBody | null, {body: NgoRegistrationBody; loggedIn: boolean}>(
    'ngo/register',
    async ({body, loggedIn}, {rejectWithValue}) => {
        try {
            return await apiRequest<ActionResultBody | null>(loggedIn ? '/api/ngos' : '/api/ngos/register', {
                method: 'POST',
                body,
                auth: loggedIn,
                fallbackMessage: 'אירעה שגיאה בעת הרישום. נסה שוב.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'אירעה שגיאה בעת הרישום. נסה שוב.'));
        }
    },
);

/** דירוג מסירה אחרי אישור הקבלה (POST api/feedbacks עם מזהה השידוך) */
export const submitFeedback = createAppAsyncThunk<void, CreateFeedbackDto>(
    'ngo/submitFeedback',
    async (payload, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/feedbacks', {
                method: 'POST',
                body: payload,
                fallbackMessage: 'שגיאה בשמירת הדירוג.',
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בשמירת הדירוג.'));
        }
    },
);

const ngoSlice = createSlice({
    name: 'ngo',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // התרומות של העמותה - ברענון ברקע הנתונים הקודמים נשארים, והשגיאה נשארת עד הצלחה
            .addCase(fetchNgoDonations.pending, (state) => {
                state.donations.status = 'loading';
            })
            .addCase(fetchNgoDonations.fulfilled, (state, action) => {
                state.donations = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchNgoDonations.rejected, (state, action) => {
                state.donations.status = 'failed';
                state.donations.error = action.payload?.message ?? 'שגיאה בטעינת נתוני העמותה.';
            })
            // פרטי העמותה - בשגיאה נשארים הפרטים הקודמים
            .addCase(fetchNgoProfile.pending, (state) => {
                state.profile.status = 'loading';
            })
            .addCase(fetchNgoProfile.fulfilled, (state, action) => {
                state.profile = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchNgoProfile.rejected, (state, action) => {
                state.profile.status = 'failed';
                state.profile.error = action.payload?.message ?? 'שגיאה בטעינת פרטי העמותה.';
            })
            // אזורים
            .addCase(fetchRegions.pending, (state) => {
                state.regions.status = 'loading';
            })
            .addCase(fetchRegions.fulfilled, (state, action) => {
                state.regions = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchRegions.rejected, (state, action) => {
                state.regions.status = 'failed';
                state.regions.error = action.payload?.message ?? 'שגיאה בטעינת אזורים.';
            })
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export default ngoSlice.reducer;

type WithNgo = {ngo: NgoState};

export const selectNgoDonations = (state: WithNgo) => state.ngo.donations.items;
export const selectNgoDonationsStatus = (state: WithNgo) => state.ngo.donations.status;
export const selectNgoDonationsError = (state: WithNgo) => state.ngo.donations.error;
export const selectNgoProfile = (state: WithNgo) => state.ngo.profile.item;
export const selectRegions = (state: WithNgo) => state.ngo.regions.items;
