import {createAsyncThunk} from '@reduxjs/toolkit';
import type {ApiErrorPayload} from '../api/http';
import type {AppDispatch, RootState} from './index';

/**
 * createAsyncThunk עם הטיפוסים של האפליקציה:
 * getState() מחזיר RootState, ו-rejectWithValue מקבל ApiErrorPayload (הודעה + קוד + סטטוס).
 *
 * דוגמה:
 *   export const fetchThings = createAppAsyncThunk('things/fetch', async (_, {rejectWithValue}) => {
 *       try { return await apiRequest<Thing[]>('/api/things'); }
 *       catch (err) { return rejectWithValue(toErrorPayload(err, 'שגיאה בטעינה.')); }
 *   });
 */
export const createAppAsyncThunk = createAsyncThunk.withTypes<{
    state: RootState;
    dispatch: AppDispatch;
    rejectValue: ApiErrorPayload;
}>();

/** מצב טעינה של נתונים בסלייס */
export type LoadStatus = 'idle' | 'loading' | 'succeeded' | 'failed';
