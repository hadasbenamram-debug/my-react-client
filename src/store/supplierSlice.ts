import {createSlice} from '@reduxjs/toolkit';
import type {SupplierDonationSummaryDto, SupplierResponseDto} from '../types/api';
import {apiRequest, toErrorPayload} from '../api/http';
import {createAppAsyncThunk} from './createAppAsyncThunk';
import type {LoadStatus} from './createAppAsyncThunk';
import {sessionCleared} from './authSlice';

/**
 * ספק (ארגון תורם): התרומות של הספק (לדשבורד, לתרומות הפתוחות ולהיסטוריה),
 * פרטי העסק של הספק המחובר, והרשמת ספק.
 */

/** תשובה כללית של פעולה (הרשמה): { message } */
export interface SupplierActionResult {
    message?: string;
}

export interface SupplierState {
    /** כל התרומות של הספק - כל דף מסנן לפי הסטטוסים שלו */
    donations: {items: SupplierDonationSummaryDto[] | null; status: LoadStatus; error: string | null};
    /** פרטי העסק של הספק המחובר (כתובת האיסוף) */
    profile: {item: SupplierResponseDto | null; status: LoadStatus; error: string | null};
}

const initialState: SupplierState = {
    donations: {items: null, status: 'idle', error: null},
    profile: {item: null, status: 'idle', error: null},
};

/** כל התרומות של הספק המחובר */
export const fetchSupplierDonations = createAppAsyncThunk<SupplierDonationSummaryDto[]>(
    'supplier/fetchDonations',
    async (_, {rejectWithValue}) => {
        try {
            const data = await apiRequest<SupplierDonationSummaryDto[] | null>('/api/donations/my-supplier-donations', {
                fallbackMessage: 'שגיאה בטעינת הנתונים מהשרת.',
            });
            return Array.isArray(data) ? data : [];
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינת הנתונים מהשרת.'));
        }
    },
);

/** תיקון 33: פרטי העסק של הספק המחובר - ממנו נלקחת כתובת האיסוף של התרומה */
export const fetchCurrentSupplier = createAppAsyncThunk<SupplierResponseDto>(
    'supplier/fetchCurrent',
    async (_, {rejectWithValue}) => {
        try {
            return await apiRequest<SupplierResponseDto>('/api/suppliers/current');
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינת פרטי העסק.'));
        }
    },
);

/**
 * הרשמת ספק (FormData עם קובץ הרישיון - הקובץ לא נשמר ב-Redux).
 * מחוברים: התפקיד מצורף לחשבון הקיים (POST api/suppliers), אחרת - הרשמה חדשה בלי טוקן.
 */
export const registerSupplier = createAppAsyncThunk<SupplierActionResult | null, {data: FormData; loggedIn: boolean}>(
    'supplier/register',
    async ({data, loggedIn}, {rejectWithValue}) => {
        try {
            return await apiRequest<SupplierActionResult | null>(loggedIn ? '/api/suppliers' : '/api/suppliers/register', {
                method: 'POST',
                body: data,
                auth: loggedIn,
                fallbackMessage: 'אירעה שגיאה בעת הרישום. נסה שוב.',
            });
        } catch (err) {
            return rejectWithValue(toErrorPayload(err, 'אירעה שגיאה בעת הרישום. נסה שוב.'));
        }
    },
);

const supplierSlice = createSlice({
    name: 'supplier',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            // התרומות של הספק - ברענון ברקע הנתונים הקודמים נשארים, והשגיאה נשארת עד הצלחה
            .addCase(fetchSupplierDonations.pending, (state) => {
                state.donations.status = 'loading';
            })
            .addCase(fetchSupplierDonations.fulfilled, (state, action) => {
                state.donations = {items: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchSupplierDonations.rejected, (state, action) => {
                state.donations.status = 'failed';
                state.donations.error = action.payload?.message ?? 'שגיאה בטעינת הנתונים מהשרת.';
            })
            // פרטי העסק
            .addCase(fetchCurrentSupplier.pending, (state) => {
                state.profile.status = 'loading';
            })
            .addCase(fetchCurrentSupplier.fulfilled, (state, action) => {
                state.profile = {item: action.payload, status: 'succeeded', error: null};
            })
            .addCase(fetchCurrentSupplier.rejected, (state, action) => {
                state.profile.status = 'failed';
                state.profile.error = action.payload?.message ?? 'שגיאה בטעינת פרטי העסק.';
            })
            // יציאה מהמערכת - לא משאירים נתונים של המשתמש הקודם
            .addCase(sessionCleared, () => initialState);
    },
});

export default supplierSlice.reducer;

type WithSupplier = {supplier: SupplierState};

export const selectSupplierDonations = (state: WithSupplier) => state.supplier.donations.items;
export const selectSupplierDonationsStatus = (state: WithSupplier) => state.supplier.donations.status;
export const selectSupplierDonationsError = (state: WithSupplier) => state.supplier.donations.error;
export const selectCurrentSupplier = (state: WithSupplier) => state.supplier.profile.item;
export const selectCurrentSupplierStatus = (state: WithSupplier) => state.supplier.profile.status;
