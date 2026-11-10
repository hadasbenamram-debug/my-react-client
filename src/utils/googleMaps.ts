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
const notifyListeners = (): void => listeners.forEach((listener) => listener());

// תיקון 40: gm_authFailure לא אומר למה המפתח נדחה. Google כותב את הסיבה רק לקונסול, למשל:
//   "Google Maps JavaScript API error: RefererNotAllowedMapError ... Your site URL to be authorized: http://localhost:5174/"
// קוראים את השורה הזו (בלי לשנות את מה שמוצג בקונסול), כדי שהמנהל יראה על המסך מה בדיוק לתקן.
/** הסיבה ש-Google דחה את מפתח הדפדפן, כפי שכתב בקונסול */
export interface GoogleMapsAuthProblem {
    /** קוד השגיאה של Google, למשל RefererNotAllowedMapError. null = Google לא כתב קוד */
    code: string | null;
    /** הכתובת ש-Google ביקש להוסיף להגבלת ה-Websites (רק ב-RefererNotAllowedMapError) */
    blockedUrl: string | null;
}

const GOOGLE_MESSAGE = /Google Maps (?:JavaScript )?API (error|warning):\s*([A-Za-z]+)/;
const BLOCKED_URL = /Your site URL to be authorized:\s*(\S+)/;

let problem: GoogleMapsAuthProblem = {code: null, blockedUrl: null};
let problemIsError = false;
let consoleWatched = false;

const readGoogleMessage = (args: unknown[]): void => {
    const text = args.map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : '')).join(' ');
    const match = GOOGLE_MESSAGE.exec(text);
    if (!match) return;
    const isError = match[1] === 'error';
    // שגיאה גוברת על אזהרה (למשל האזהרה InvalidKey שמגיעה לפני השגיאה InvalidKeyMapError)
    if (problemIsError && !isError) return;
    problem = {code: match[2], blockedUrl: BLOCKED_URL.exec(text)?.[1] ?? problem.blockedUrl};
    problemIsError = problemIsError || isError;
    // הסיבה הגיעה אחרי ש-Google כבר דחה את המפתח - מעדכנים את ההודעה שעל המסך
    if (authFailed) notifyListeners();
};

const watchGoogleConsoleMessages = (): void => {
    if (consoleWatched) return;
    consoleWatched = true;
    (['error', 'warn'] as const).forEach((level) => {
        const original = console[level].bind(console);
        console[level] = (...args: unknown[]) => {
            try {
                readGoogleMessage(args);
            } catch {
                // רק אבחון - אף פעם לא מפריע להדפסה עצמה
            }
            original(...args);
        };
    });
};

const installAuthFailureHandler = (): void => {
    watchGoogleConsoleMessages();
    if (window.gm_authFailure) return;
    window.gm_authFailure = () => {
        authFailed = true;
        console.warn('Google Maps rejected the browser key (check the key restrictions in Google Cloud). Showing map images instead.');
        notifyListeners();
    };
};

export const googleMapsAuthFailed = (): boolean => authFailed;

export const googleMapsAuthProblem = (): GoogleMapsAuthProblem => problem;

/** הרשמה להודעה שהמפתח נדחה. מחזיר פונקציה לביטול ההרשמה */
export const onGoogleMapsAuthFailure = (listener: () => void): (() => void) => {
    installAuthFailureHandler();
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
