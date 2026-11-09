import type {BrowserMapConfigDto} from '../types/api';
import {authHeaders} from './auth';

// הגדרות המפה האינטראקטיבית (Google Maps JavaScript API).
// אין מפתח בקוד, בקובץ .env או ב-git: מפתח הדפדפן שמור ב-User Secrets של השרת, והשרת נותן אותו
// רק למשתמש מחובר (api/map/browser-config). זה מפתח נפרד ממפתח השרת, ומוגבל ב-Google Cloud
// ל-Maps JavaScript API בלבד ולכתובות של האתר - כך שגם מי שרואה אותו לא יכול להשתמש בו במקום אחר.

/** 0,0 במערכת = "אין מיקום" (כמו בשרת) */
export const hasLocation = (lat: number | null | undefined, lng: number | null | undefined): boolean =>
    lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

let pending: Promise<BrowserMapConfigDto | null> | null = null;

/** ההגדרות נטענות פעם אחת לכל האפליקציה. null = אין מפה אינטראקטיבית (מציגים תמונה מהשרת) */
export const loadBrowserMapConfig = (): Promise<BrowserMapConfigDto | null> => {
    if (!pending) {
        pending = fetch('/api/map/browser-config', {headers: authHeaders()})
            .then(async (res) => (res.ok ? ((await res.json()) as BrowserMapConfigDto) : null))
            .catch(() => null)
            .then((config) => {
                // תקלה זמנית (למשל השרת לא עלה) - בפעם הבאה מנסים שוב
                if (!config) pending = null;
                return config;
            });
    }
    return pending;
};

// Google קורא ל-window.gm_authFailure כשהמפתח נדחה - למשל כתובת האתר לא ברשימה המותרת של המפתח,
// או שה-API לא הופעל. במקום מפה שבורה עם הודעת שגיאה, כל המפות עוברות לתמונה מהשרת.
declare global {
    interface Window {
        gm_authFailure?: () => void;
    }
}

let authFailed = false;
const listeners = new Set<() => void>();

const installAuthFailureHandler = (): void => {
    if (window.gm_authFailure) return;
    window.gm_authFailure = () => {
        authFailed = true;
        console.warn('Google Maps rejected the browser key (check the key restrictions in Google Cloud). Showing map images instead.');
        listeners.forEach((listener) => listener());
    };
};

export const googleMapsAuthFailed = (): boolean => authFailed;

/** הרשמה להודעה שהמפתח נדחה. מחזיר פונקציה לביטול ההרשמה */
export const onGoogleMapsAuthFailure = (listener: () => void): (() => void) => {
    installAuthFailureHandler();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
