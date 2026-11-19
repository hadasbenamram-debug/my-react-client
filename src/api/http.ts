import type {ApiErrorBody} from '../types/api';
import {authHeaders} from '../utils/auth';

/**
 * לקוח ה-HTTP היחיד של האפליקציה. כל הקריאות לשרת עוברות דרך thunks (store/*Slice.ts),
 * וה-thunks משתמשים בפונקציות שכאן - כך הטוקן, ה-JSON והודעות השגיאה מטופלים במקום אחד.
 * (השמירה על 401 / סיסמה זמנית נעשית ב-installAuthGuard שעוטף את fetch - ראו utils/auth.ts)
 */

/** שגיאה מהשרת במבנה אחיד ושניתן לשמור ב-Redux (בלי מחלקות / פונקציות) */
export interface ApiErrorPayload {
    /** הודעה להצגה למשתמש */
    message: string;
    /** קוד HTTP (0 = אין תקשורת עם השרת) */
    status: number;
    /** קוד השגיאה מהשרת, למשל Expired / NotFound / ValidationFailed */
    code?: string;
    /** שגיאות ולידציה לפי שדה */
    errors?: Record<string, string[]>;
}

export class ApiRequestError extends Error {
    readonly payload: ApiErrorPayload;

    constructor(payload: ApiErrorPayload) {
        super(payload.message);
        this.name = 'ApiRequestError';
        this.payload = payload;
    }
}

export const NETWORK_ERROR_MESSAGE = 'אין תקשורת עם השרת.';

export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** אובייקט נשלח כ-JSON; FormData נשלח כמו שהוא (העלאת קבצים) */
    body?: unknown;
    /** הודעה כשהשרת לא החזיר הודעה משלו */
    fallbackMessage?: string;
    /** איך לקרוא את התשובה. ברירת מחדל: json (תשובה ריקה -> null) */
    responseType?: 'json' | 'blob' | 'text' | 'none';
    /** הוספת הטוקן (ברירת מחדל: כן) */
    auth?: boolean;
    signal?: AbortSignal;
}

const messageFrom = (body: ApiErrorBody | null): string | undefined => {
    if (!body) return undefined;
    if (body.message) return body.message;
    const first = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    return first || undefined;
};

/** בקשה "גולמית" - מחזירה את ה-Response עצמו (לזרם של העוזר החכם). זורקת ApiRequestError על כשל רשת */
export async function apiFetchRaw(url: string, init: RequestInit = {}, auth = true): Promise<Response> {
    const headers = {...(auth ? authHeaders() : {}), ...(init.headers as Record<string, string> | undefined)};
    try {
        return await fetch(url, {...init, headers});
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new ApiRequestError({message: NETWORK_ERROR_MESSAGE, status: 0});
    }
}

/** קורא תשובת שגיאה והופך אותה ל-ApiRequestError */
export async function toApiError(res: Response, fallbackMessage: string): Promise<ApiRequestError> {
    const body = (await res.json().catch(() => null)) as ApiErrorBody | null;
    return new ApiRequestError({
        message: messageFrom(body) ?? fallbackMessage,
        status: res.status,
        code: body?.code ?? undefined,
        errors: body?.errors ?? undefined,
    });
}

/** בקשה לשרת. מחזירה את גוף התשובה, או זורקת ApiRequestError עם הודעה מתאימה */
export async function apiRequest<T>(url: string, options: ApiRequestOptions = {}): Promise<T> {
    const {method = 'GET', body, fallbackMessage = 'שגיאה בתקשורת עם השרת.', responseType = 'json', auth = true, signal} = options;

    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers: Record<string, string> = {};
    if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

    const res = await apiFetchRaw(url, {
        method,
        headers,
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
        signal,
    }, auth);

    if (!res.ok) throw await toApiError(res, fallbackMessage);

    if (responseType === 'none') return undefined as T;
    if (responseType === 'blob') return (await res.blob()) as T;
    if (responseType === 'text') return (await res.text()) as T;
    if (res.status === 204) return null as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
}

/** הופך כל שגיאה (מ-thunk שנכשל, מ-unwrap או מהרשת) למבנה ApiErrorPayload */
export function toErrorPayload(err: unknown, fallbackMessage = 'שגיאה בתקשורת עם השרת.'): ApiErrorPayload {
    if (err instanceof ApiRequestError) return err.payload;
    if (err && typeof err === 'object' && 'message' in err && typeof (err as {message: unknown}).message === 'string') {
        const e = err as Partial<ApiErrorPayload> & {message: string};
        return {message: e.message || fallbackMessage, status: typeof e.status === 'number' ? e.status : 0, code: e.code, errors: e.errors};
    }
    return {message: fallbackMessage, status: 0};
}

/** ההודעה להצגה מתוך שגיאה של dispatch(thunk()).unwrap() */
export const errorMessage = (err: unknown, fallbackMessage = 'שגיאה בתקשורת עם השרת.'): string =>
    toErrorPayload(err, fallbackMessage).message;
