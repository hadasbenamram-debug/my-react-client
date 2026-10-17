import axios from 'axios';
import type {ApiErrorBody} from '../types/api';

// כל שגיאות השרת מגיעות עכשיו באותו מבנה: { status, message, code?, errors? }

const fromBody = (body: ApiErrorBody | null | undefined): string | undefined => {
    if (!body) return undefined;
    if (body.message) return body.message;
    const first = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    return first || undefined;
};

/** ה-message שהשרת החזיר בגוף השגיאה (אם זו שגיאת axios עם תשובה), אחרת undefined */
export const getApiErrorMessage = (err: unknown): string | undefined =>
    axios.isAxiosError<ApiErrorBody>(err) ? fromBody(err.response?.data) : undefined;

/** אותו דבר עבור fetch: קורא את גוף התשובה ומחזיר הודעה למשתמש */
export const readErrorMessage = async (res: Response, fallback: string): Promise<string> => {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    return fromBody(body) ?? fallback;
};
