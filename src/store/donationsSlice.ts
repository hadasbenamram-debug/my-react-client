import {createSlice} from '@reduxjs/toolkit';
import type {
    CommentDto,
    CreateCommentDto,
    CreateDonationDto,
    DonationResponseDto,
    FoodCategoryResponseDto,
    ImageAnalysisResponseDto,
    UpdateDonationDto,
} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * תרומות: קטגוריות המזון, תרומה בודדת (מסך התרומה), השיחה על התרומה,
 * ופעולות על תרומה - יצירה, ניתוח תמונה, עריכה, ביטול ואישור קבלה.
 * (רשימות התרומות של הספק / העמותה נמצאות ב-supplierSlice / ngoSlice)
 */

/** פריט שה-AI זיהה בתמונה (תוכן aiParsedData אחרי JSON.parse) */
export interface AiParsedItem {
    categoryId?: number | string;
    quantity?: number | string;
    weightKg?: number | string;
    error?: string;
}

/** תשובת analyze-image: לפי ה-DTO aiParsedData הוא string, אבל הקוד תומך גם באובייקט מוכן */
export type AnalyzeImageResponse = Partial<Omit<ImageAnalysisResponseDto, 'aiParsedData'>> & {
    aiParsedData?: string | AiParsedItem | AiParsedItem[] | null;
};

/** תשובת אישור הקבלה: מזהה השידוך (לדירוג) */
interface ConfirmReceiptResponse {
    matchId: number;
}

/** פרמטרים לטעינת השיחה על תרומה. role = null למנהל (השרת מחזיר לו את כל התגובות) */
export interface DonationCommentsArgs {
    donationId: number;
    role: string | null;
}

export interface DonationsState {
    categories: {items: FoodCategoryResponseDto[] | null; status: LoadStatus; error: string | null};
    /** התרומה שמוצגת במסך התרומה */
    detail: {donationId: number | null; item: DonationResponseDto | null; status: LoadStatus; error: string | null};
    /** השיחה (עץ התגובות) על התרומה שבמסך התרומה */
    comments: {donationId: number | null; items: CommentDto[]; status: LoadStatus};
}

const initialState: DonationsState = {
    categories: {items: null, status: 'idle', error: null},
    detail: {donationId: null, item: null, status: 'idle', error: null},
    comments: {donationId: null, items: [], status: 'idle'},
};

// ───────── טעינת נתונים ─────────

/** קטגוריות המזון (לבחירה ביצירת תרומה) */
export const fetchCategories = createAppAsyncThunk<FoodCategoryResponseDto[]>(
    'donations/fetchCategories',
    async (_, {rejectWithValue}) => {
        try {
            const raw = await apiRequest<FoodCategoryResponseDto[] | null>('/api/categories');
            if (!Array.isArray(raw)) throw new Error('השרת החזיר רשימת קטגוריות לא תקינה.');
            return raw;
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לטעון את הקטגוריות. נסו לרענן את הדף.'));
        }
    },
);

/** תרומה אחת לפי מזהה (מסך התרומה, וגם לפני עריכה בתרומות הפתוחות) */
export const fetchDonationById = createAppAsyncThunk<DonationResponseDto, number>(
    'donations/fetchById',
    async (donationId, {rejectWithValue}) => {
        try {
            return await apiRequest<DonationResponseDto>(`/api/donations/${donationId}`, {
                fallbackMessage: 'לא הצלחנו לטעון את התרומה.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא הצלחנו לטעון את התרומה.'));
        }
    },
);

/** השיחה על תרומה: עץ התגובות של המשתמש, מסונן לתרומה הזו וממוין מהישנה לחדשה */
export const fetchDonationComments = createAppAsyncThunk<CommentDto[], DonationCommentsArgs>(
    'donations/fetchComments',
    async ({donationId, role}, {rejectWithValue}) => {
        try {
            const query = role ? `?role=${role}` : '';
            const all = (await apiRequest<CommentDto[] | null>(`/api/comments/tree${query}`)) ?? [];
            return all
                .filter((c) => c.donationId === donationId)
                .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא הצלחנו לטעון את השיחה.'));
        }
    },
);

// ───────── פעולות ─────────

/** הודעה חדשה בשיחה על התרומה (או תגובה להודעה קיימת) */
export const postDonationComment = createAppAsyncThunk<void, CreateCommentDto>(
    'donations/postComment',
    async (body, {rejectWithValue}) => {
        try {
            await apiRequest<void>('/api/comments', {method: 'POST', body, responseType: 'none'});
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא הצלחנו לשלוח את ההודעה.'));
        }
    },
);

/** ניתוח תמונת התרומה ב-AI. הקובץ נשלח כ-FormData ולא נשמר ב-Redux */
export const analyzeDonationImage = createAppAsyncThunk<AnalyzeImageResponse, File>(
    'donations/analyzeImage',
    async (file, {rejectWithValue}) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            const data = await apiRequest<AnalyzeImageResponse | null>('/api/donations/analyze-image', {
                method: 'POST',
                body: formData,
                fallbackMessage: 'שגיאה בניתוח התמונה מול השרת.',
            });
            return data ?? {};
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בניתוח התמונה מול השרת.'));
        }
    },
);

/** פרסום תרומה חדשה. מחזיר את התרומה שנוצרה (או null אם השרת לא החזיר גוף) */
export const createDonation = createAppAsyncThunk<DonationResponseDto | null, CreateDonationDto>(
    'donations/create',
    async (payload, {rejectWithValue}) => {
        try {
            return await apiRequest<DonationResponseDto | null>('/api/donations', {
                method: 'POST',
                body: payload,
                fallbackMessage: 'שגיאה בשמירת התרומה בשרת.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בשמירת התרומה בשרת.'));
        }
    },
);

/** עריכת תרומה (כל עוד היא ממתינה לשיבוץ) */
export const updateDonation = createAppAsyncThunk<void, {donationId: number; body: UpdateDonationDto}>(
    'donations/update',
    async ({donationId, body}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/donations/${donationId}`, {
                method: 'PUT',
                body,
                fallbackMessage: 'שגיאה בעדכון התרומה.',
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בעדכון התרומה.'));
        }
    },
);

/** ביטול תרומה על ידי הספק (עם סיבה לא חובה). אם כבר שובץ מתנדב - השרת מודיע לו */
export const cancelDonation = createAppAsyncThunk<void, {donationId: number; reason: string | null}>(
    'donations/cancel',
    async ({donationId, reason}, {rejectWithValue}) => {
        try {
            await apiRequest<void>(`/api/donations/${donationId}/cancel`, {
                method: 'PUT',
                body: {reason},
                fallbackMessage: 'לא ניתן לבטל את התרומה.',
                responseType: 'none',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'לא ניתן לבטל את התרומה.'));
        }
    },
);

/** תיקון 63: העמותה מאשרת שהתרומה הגיעה. מחזיר את מזהה השידוך - ואיתו עוברים לדירוג המסירה */
export const confirmDonationReceipt = createAppAsyncThunk<number, number>(
    'donations/confirmReceipt',
    async (donationId, {rejectWithValue}) => {
        try {
            const body = await apiRequest<ConfirmReceiptResponse>(`/api/donations/${donationId}/confirm-receipt`, {
                method: 'POST',
                fallbackMessage: 'שגיאה באישור קבלת התרומה.',
            });
            return body.matchId;
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה באישור קבלת התרומה.'));
        }
    },
);

const donationsSlice = createSlice({
    name: 'donations',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // קטגוריות
            .addCase(fetchCategories.pending, (state) => {
                state.categories.status = 'loading';
            })
            .addCase(fetchCategories.fulfilled, (state, action) => {
                state.categories = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchCategories.rejected, (state, action) => {
                state.categories.status = 'failed';
                state.categories.error = action.payload?.message ?? 'לא ניתן לטעון את הקטגוריות. נסו לרענן את הדף.';
            })
            // תרומה בודדת - תרומה אחרת מתחילה ריקה; רענון ברקע משאיר את הנתונים הקיימים
            .addCase(fetchDonationById.pending, (state, action) => {
                if (state.detail.donationId !== action.meta.arg) {
                    state.detail = {donationId: action.meta.arg, item: null, status: 'loading', error: null};
                } else {
                    state.detail.status = 'loading';
                }
            })
            .addCase(fetchDonationById.fulfilled, (state, action) => {
                if (state.detail.donationId !== action.meta.arg) return;
                state.detail.item = action.payload;
                state.detail.status = 'succeeded';
                state.detail.error = null;
            })
            .addCase(fetchDonationById.rejected, (state, action) => {
                if (state.detail.donationId !== action.meta.arg) return;
                state.detail.status = 'failed';
                state.detail.error = action.payload?.message ?? 'לא הצלחנו לטעון את התרומה.';
            })
            // השיחה על התרומה - שגיאה בטעינה לא מוצגת (נשארת השיחה הקודמת)
            .addCase(fetchDonationComments.pending, (state, action) => {
                if (state.comments.donationId !== action.meta.arg.donationId) {
                    state.comments = {donationId: action.meta.arg.donationId, items: [], status: 'loading'};
                } else {
                    state.comments.status = 'loading';
                }
            })
            .addCase(fetchDonationComments.fulfilled, (state, action) => {
                if (state.comments.donationId !== action.meta.arg.donationId) return;
                state.comments.items = action.payload;
                state.comments.status = 'succeeded';
            })
            .addCase(fetchDonationComments.rejected, (state, action) => {
                if (state.comments.donationId !== action.meta.arg.donationId) return;
                state.comments.status = 'failed';
            })
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export default donationsSlice.reducer;

type WithDonations = {donations: DonationsState};

export const selectCategories = (state: WithDonations) => state.donations.categories.items;
export const selectCategoriesStatus = (state: WithDonations) => state.donations.categories.status;
/** התרומה שנטענה - רק אם היא התרומה המבוקשת */
export const selectDonationDetail = (state: WithDonations, donationId: number) =>
    state.donations.detail.donationId === donationId ? state.donations.detail.item : null;
export const selectDonationDetailError = (state: WithDonations, donationId: number) =>
    state.donations.detail.donationId === donationId ? state.donations.detail.error : null;
const NO_COMMENTS: CommentDto[] = [];
export const selectDonationComments = (state: WithDonations, donationId: number) =>
    state.donations.comments.donationId === donationId ? state.donations.comments.items : NO_COMMENTS;
