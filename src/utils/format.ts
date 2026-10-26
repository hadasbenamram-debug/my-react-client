// תצוגת זמנים: השרת שולח UTC (ISO). התצוגה בשעון המקומי של הדפדפן.

const asDate = (iso: string | null | undefined): Date | null => {
    if (!iso) return null;
    // ערך בלי אזור זמן מהשרת הוא UTC
    const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
};

export const formatTime = (iso: string | null | undefined): string => {
    const d = asDate(iso);
    return d ? d.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'}) : '—';
};

export const formatDateTime = (iso: string | null | undefined): string => {
    const d = asDate(iso);
    return d ? d.toLocaleString('he-IL', {dateStyle: 'short', timeStyle: 'short'}) : '—';
};

/** "13:30:00" -> "13:30" */
export const formatTimeSpan = (value: string | null | undefined): string => (value ? value.substring(0, 5) : '—');

/**
 * תאריך בלבד (למשל תוקף רישיון נהיגה, "2027-01-31T00:00:00"): האם הוא לפני היום המקומי.
 * משווים תאריך מול תאריך - רישיון שתוקפו היום עדיין בתוקף עד סוף היום (כמו בשרת).
 */
export const isDateBeforeToday = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return iso.substring(0, 10) < today;
};

/** "עכשיו" / "לפני 5 דקות" / "לפני שעתיים" / "אתמול ב-14:30" / "12 באוק׳ ב-09:15" */
export const formatRelativeTime = (iso: string | null | undefined): string => {
    const d = asDate(iso);
    if (!d) return '';
    const now = new Date();
    const minutes = Math.floor((now.getTime() - d.getTime()) / 60000);
    const time = d.toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});

    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return minutes === 1 ? 'לפני דקה' : `לפני ${minutes} דקות`;

    const sameDay = d.toDateString() === now.toDateString();
    const hours = Math.floor(minutes / 60);
    if (sameDay) return hours === 1 ? 'לפני שעה' : hours === 2 ? 'לפני שעתיים' : `לפני ${hours} שעות`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return `אתמול ב-${time}`;

    return `${d.toLocaleDateString('he-IL', {day: 'numeric', month: 'short'})} ב-${time}`;
};

export const secondsUntil = (iso: string | null | undefined): number => {
    const d = asDate(iso);
    return d ? Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000)) : 0;
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
    AwaitingVolunteerConfirmation: 'ממתין לאישור המתנדב',
    Confirmed: 'אושר',
    InPickup: 'בדרך לאיסוף',
    InTransit: 'נאסף - בדרך לעמותה',
    TimedOut: 'פג זמן התגובה',
    Completed: 'נמסר',
    Declined: 'נדחה',
    NoShow: 'No-Show',
    Cancelled: 'בוטל',
};

export const DONATION_STATUS_LABELS: Record<string, string> = {
    Pending: 'ממתינה לשיבוץ',
    Matched: 'שובצה',
    PickedUp: 'נאספה',
    Delivered: 'נמסרה - ממתינה לאישור',
    Completed: 'הושלמה',
    Expired: 'פג תוקף',
    Cancelled: 'בוטלה',
};
