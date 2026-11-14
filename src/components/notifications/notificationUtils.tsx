import type { ReactNode } from 'react';

// ==============================================================
// תיקון 72: עזרים משותפים לדף ההתראות ("חפיסה"): סוגים, אייקונים ותאריכים
// ==============================================================

export type DeckType =
  | 'action' | 'warning' | 'confirmed' | 'delivered' | 'pickup'
  | 'route' | 'assigned' | 'published' | 'account' | 'info';

export type Tone = 'amber' | 'teal' | 'neutral';

/** קישור בתוך האתר (כפתור בקלף / שורה ברשימה) */
export interface DeckLink {
  label: string;
  to: string;
}

/** התראה כפי שהחפיסה מציגה אותה (ממופה מ-NotificationDto של השרת - ראו toDeckNotification) */
export interface DeckNotification {
  id: number;
  type: DeckType;
  title: string;
  body?: string | null;
  /** ציטוט (למשל תודה מהעמותה) - מוצג בבועה במקום body */
  quote?: { from: string; text: string } | null;
  donationId?: number | null;
  /** ISO מהשרת (UTC) */
  createdAt: string;
  isRead: boolean;
  /** הכפתור הראשי (פעולה שנדרשת) */
  action?: DeckLink | null;
  /** הכפתור המשני / הקישור בשורה שברשימת הנקראו */
  link?: DeckLink | null;
}

/** פרטי תרומה שמוצגים בתחתית הקלף */
export interface DeckDonation {
  items: string;
  ngo?: string | null;
}

// type של כל התראה קובע אייקון, צבע ותווית
export const TYPES: Record<DeckType, { icon: IconName; tone: Tone; label: string }> = {
  action:    { icon: 'clock',   tone: 'amber',   label: 'נדרשת פעולה' },
  warning:   { icon: 'alert',   tone: 'amber',   label: 'לתשומת לבך' },
  confirmed: { icon: 'heart',   tone: 'teal',    label: 'אישור קבלה' },
  delivered: { icon: 'check',   tone: 'teal',    label: 'מסירה' },
  pickup:    { icon: 'box',     tone: 'neutral', label: 'איסוף' },
  route:     { icon: 'pin',     tone: 'neutral', label: 'בדרך' },
  assigned:  { icon: 'user',    tone: 'neutral', label: 'שיבוץ מתנדב' },
  published: { icon: 'send',    tone: 'neutral', label: 'פרסום' },
  account:   { icon: 'sliders', tone: 'neutral', label: 'החשבון שלי' },
  info:      { icon: 'bell',    tone: 'neutral', label: 'עדכון' },
};
export const typeOf = (n: DeckNotification) => TYPES[n.type] ?? TYPES.info;

// אייקונים (קווי מתאר, 24×24)
const PATHS = {
  clock:   <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  alert:   <><path d="M12 4.5l8.5 15h-17z" /><path d="M12 10v4.2M12 16.8v.2" /></>,
  heart:   <path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 7.6a3.9 3.9 0 0 1 7 2.5c0 5.1-7 9.4-7 9.4z" />,
  check:   <path d="M5 12.5l4.2 4.2L19 7" />,
  box:     <><path d="M4 8l8-4 8 4v8l-8 4-8-4z" /><path d="M4 8l8 4 8-4M12 12v8" /></>,
  pin:     <><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  user:    <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  send:    <><path d="M4 12l16-7-6 16-3-6.5z" /><path d="M11 14.5L20 5" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  bell:    <><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft:  <path d="M15 6l-6 6 6 6" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, strokeWidth = 1.8 }: { name: IconName; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

// ---------- תאריכים ----------
/** תאריך מהשרת: ערך בלי אזור זמן הוא UTC (כמו ב-utils/format) */
export const parseServerDate = (iso: string): Date => {
  const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const MONTHS_SHORT = ['בינו׳', 'בפבר׳', 'במרץ', 'באפר׳', 'במאי', 'ביוני', 'ביולי', 'באוג׳', 'בספט׳', 'באוק׳', 'בנוב׳', 'בדצמ׳'];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const daysAgo = (d: Date, now: Date) => Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
export const hhmm = (d: Date) => d.toTimeString().slice(0, 5);

// "היום" / "אתמול" / "10 בנוב׳"
export const dayName = (d: Date, now: Date) => {
  const n = daysAgo(d, now);
  return n === 0 ? 'היום' : n === 1 ? 'אתמול' : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};

// "08:40" / "אתמול, 23:31" / "10 בנוב׳"
export const shortWhen = (d: Date, now: Date) => {
  const n = daysAgo(d, now);
  return n === 0 ? hhmm(d) : n === 1 ? `אתמול, ${hhmm(d)}` : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
};
