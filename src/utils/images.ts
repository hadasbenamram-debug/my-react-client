// כתובת תיקיית התמונות בשרת - מוגדרת במקום אחד בלבד.
// השרת מחזיר בכל תרומה רק את שם הקובץ (השדה image), והכתובת המלאה נבנית כאן: IMAGES_URL + שם הקובץ.
// הנתיב יחסי, ועובר דרך ה-proxy של Vite אל השרת (ראו vite.config.js).
export const IMAGES_URL = '/images/';

export function imageUrl(fileName: string | null | undefined): string | null {
    if (!fileName) return null;
    return IMAGES_URL + encodeURIComponent(fileName);
}
