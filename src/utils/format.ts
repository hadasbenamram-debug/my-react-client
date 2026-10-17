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
