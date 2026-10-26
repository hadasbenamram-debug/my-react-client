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

const sameRole = (a: string | undefined, b: string | undefined) =>
    String(a || '').toLowerCase() === String(b || '').toLowerCase();

/**
 * שמירת הסשן אחרי התחברות / החלפת סיסמה (השרת מחזיר טוקן חדש - הישן כבר לא תקף).
 * keepActiveRole: באמצע עבודה (למשל החלפת סיסמה) נשארים בתפקיד שנבחר, אם הוא עדיין מאושר.
 */
export const saveSession = (
    auth: Pick<AuthResponseDto, 'token' | 'role' | 'mustChangePassword' | 'roles'>,
    email?: string,
    keepActiveRole = false,
): void => {
    localStorage.setItem('token', auth.token);
    const previous = getCurrentUser();
    const roles: string[] = auth.roles && auth.roles.length > 0 ? auth.roles : [auth.role];
    const keep = keepActiveRole && roles.some((r) => sameRole(r, previous.role));
    const user: StoredUser = {
        ...previous,
        email: email ?? previous.email,
        role: keep ? previous.role : auth.role,
        roles,
        mustChangePassword: auth.mustChangePassword === true,
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
};

// ───────── תיקון 10: חשבון אחד עם כמה תפקידים (למשל ספק שהוא גם מתנדב) ─────────

/** איך מציגים כל תפקיד למשתמש */
export const roleTitle = (roleValue: string | undefined): string => {
    const role = String(roleValue || '').toLowerCase();
    if (role === 'admin') return 'מנהל/ת מערכת';
    if (role.includes('volunt')) return 'מתנדב/ת';
    if (role.includes('suppl')) return 'ספק / תורם';
    if (role.includes('ngo')) return 'עמותה';
    return 'משתמש/ת';
};

/** התפקידים המאושרים של החשבון, חוץ מהתפקיד הפעיל */
export const otherRoles = (): string[] => {
    const user = getCurrentUser();
    return (user.roles ?? []).filter((r) => !sameRole(r, user.role));
};

/** עדכון רשימת התפקידים המאושרים מהשרת (למשל אחרי שהמנהל אישר תפקיד נוסף) */
export const syncRoles = (approved: string[]): void => {
    if (approved.length === 0) return;
    const user = getCurrentUser();
    localStorage.setItem('currentUser', JSON.stringify({ ...user, roles: approved }));
};

/**
 * מעבר לתפקיד אחר של אותו חשבון. בשרת אין מה לעדכן: ההרשאות נבדקות לפי הפרופילים של המשתמש,
 * ורק המסכים והתפריט נבנים לפי התפקיד הפעיל - לכן טוענים מחדש את האפליקציה במסך הבית של התפקיד.
 */
export const switchRole = (role: string, path?: string): void => {
    const user = getCurrentUser();
    if (!(user.roles ?? []).some((r) => sameRole(r, role))) return;
    localStorage.setItem('currentUser', JSON.stringify({ ...user, role }));
    window.location.assign(path ?? homePathForRole(role));
};

/** לאיזה תפקיד שייך מסך (למשל קישור מהתראה למסך של מתנדב). null = מסך משותף לכולם */
export const roleForPath = (path: string): string | null => {
    if (path.startsWith('/app/volunteer/')) return 'Volunteer';
    if (path.startsWith('/app/supplier/')) return 'Supplier';
    if (path.startsWith('/app/ngo/')) return 'Ngo';
    if (path.startsWith('/app/admin/')) return 'Admin';
    return null;
};

/** האם המסך שייך לתפקיד אחר (מאושר) של אותו חשבון - ואז עוברים אליו במקום "לאבד" את הקישור */
export const otherRoleForPath = (path: string): string | null => {
    const role = roleForPath(path);
    const user = getCurrentUser();
    if (!role || sameRole(role, user.role)) return null;
    return (user.roles ?? []).find((r) => sameRole(r, role)) ?? null;
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
