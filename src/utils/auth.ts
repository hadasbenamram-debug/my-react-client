import axios from 'axios';
import type {AuthResponseDto} from '../types/api';
import type {StoredUser} from '../types';

// כל הטיפול בטוקן ובמשתמש המחובר במקום אחד (בעבר כל עמוד קרא localStorage בעצמו,
// וחלק מהעמודים אף שמרו טוקן מהכתובת כטוקן התחברות).

export const getToken = (): string | null => {
    try {
        return localStorage.getItem('token');
    } catch {
        return null;
    }
};

/** כותרות לבקשה מאומתת. מוסיף Content-Type רק כשמבקשים (לא ב-FormData). */
export const authHeaders = (json = false): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    if (json) headers['Content-Type'] = 'application/json';
    return headers;
};

export const getCurrentUser = (): StoredUser => {
    try {
        const stored = localStorage.getItem('currentUser');
        return stored ? (JSON.parse(stored) as StoredUser) : {role: 'guest'};
    } catch {
        return {role: 'guest'};
    }
};

/** שמירת הסשן אחרי התחברות / החלפת סיסמה (השרת מחזיר טוקן חדש - הישן כבר לא תקף) */
export const saveSession = (auth: Pick<AuthResponseDto, 'token' | 'role' | 'mustChangePassword'>, email?: string): void => {
    localStorage.setItem('token', auth.token);
    const previous = getCurrentUser();
    const user: StoredUser = {
        ...previous,
        email: email ?? previous.email,
        role: auth.role,
        mustChangePassword: auth.mustChangePassword === true,
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
};

export const clearSession = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
};

export const mustChangePassword = (): boolean => getCurrentUser().mustChangePassword === true;

export const homePathForRole = (roleValue: string | undefined): string => {
    const role = String(roleValue || '').toLowerCase();
    if (role === 'admin') return '/app/admin/dashboard';
    if (role.includes('volunt')) return '/app/volunteer/dashboard';
    if (role.includes('suppl') || role.includes('business')) return '/app/supplier/dashboard';
    if (role.includes('ngo') || role.includes('org')) return '/app/ngo/dashboard';
    return '/app/profile';
};

/**
 * שמירה מרכזית על תשובות השרת (מותקן פעם אחת ב-main.tsx):
 *  - 401 על בקשה עם טוקן: הטוקן בוטל (למשל הסיסמה הוחלפה במכשיר אחר) -> יציאה ומעבר להתחברות.
 *  - 403 עם code=PasswordChangeRequired: סיסמה זמנית -> מעבר לפרופיל להחלפת סיסמה.
 */
export const installAuthGuard = (): void => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const response = await originalFetch(input, init);
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        if (!url.includes('/api/') || url.includes('/api/auth/login')) return response;

        if (response.status === 401 && getToken()) {
            clearSession();
            if (!window.location.pathname.startsWith('/app/login')) window.location.href = '/app/login';
        } else if (response.status === 403) {
            const body = await response.clone().json().catch(() => null) as {code?: string} | null;
            if (body?.code === 'PasswordChangeRequired' && !window.location.pathname.startsWith('/app/profile')) {
                window.location.href = '/app/profile?mustChange=1';
            }
        }

        return response;
    };

    // אותו דבר לבקשות axios
    axios.interceptors.request.use((config) => {
        const token = getToken();
        if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
        return config;
    });
    axios.interceptors.response.use(undefined, (error: unknown) => {
        if (axios.isAxiosError<{code?: string}>(error)) {
            if (error.response?.status === 401 && getToken()) {
                clearSession();
                if (!window.location.pathname.startsWith('/app/login')) window.location.href = '/app/login';
            } else if (error.response?.status === 403 && error.response.data?.code === 'PasswordChangeRequired'
                && !window.location.pathname.startsWith('/app/profile')) {
                window.location.href = '/app/profile?mustChange=1';
            }
        }
        return Promise.reject(error);
    });
};
