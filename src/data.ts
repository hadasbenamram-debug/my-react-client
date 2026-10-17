import type {Point} from './types';

/** פריט בתפריט: `id` גולל לסקשן בעמוד הבית, `to` מנווט לנתיב (Route). */
export interface NavItem {
    label: string;
    id?: string;
    to?: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface SocialLink {
    label: string;
    short: string;
    href: string;
}

export type SceneVariant = 'heart' | 'basket';

/** Props-compatible config for a GrowScene (spread with `{...SCENES.heart}`). */
export interface GrowSceneConfig {
    id: string;
    variant: SceneVariant;
    maxScale: number;
    minScale?: number;
    beat?: boolean;
    darkFlood?: boolean;
    title: string;
    text?: string;
}

export interface CaptionConfig {
    title: string;
    text?: string;
}

export interface Scenes {
    heart: GrowSceneConfig;
    car: CaptionConfig;
    basket: GrowSceneConfig;
}

export interface MapPlace {
    name: string;
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    dx: number;
}

export interface MapRoute {
    from: Point;
    to: Point;
    bow: number;
}

export interface StatItem {
    value: number;
    suffix: string;
    label: string;
}

// כל קבוצה מייצגת אזור בתפריט הצדדי.
// פריט עם `id` גולל לסקשן בעמוד הבית, פריט עם `to` מנווט לנתיב (Route) קיים.
export const NAV_GROUPS: NavGroup[] = [
    {
        title: 'עמוד הבית',
        items: [
            {id: 'hero', label: 'ראשי'},
            {id: 'map', label: 'פריסה ארצית'},
            {id: 'community', label: 'הקהילה'},
            {id: 'donate', label: 'תרומת מזון'},
            {id: 'awareness', label: 'ערבות הדדית'},
            {id: 'impact', label: 'ההשפעה בשטח'}
        ]
    },
    {
        title: 'כללי',
        items: [
            {label: 'התחברות', to: '/app/login'},
            {label: 'שכחתי סיסמה', to: '/app/forgot-password'},
            {label: 'הרשמת מתנדב', to: '/app/register-volunteer'},
            {label: 'הרשמת ספק', to: '/app/register-supplier'},
            {label: 'הרשמת עמותה', to: '/app/register-ngo'},
            {label: 'פרופיל', to: '/app/profile'},
            {label: 'התראות', to: '/app/notifications'},
            {label: 'צרו קשר', to: '/contact'}
        ]
    },
    {
        title: 'אזור מתנדב',
        items: [
            {label: 'דשבורד מתנדב', to: '/app/volunteer/dashboard'},
            {label: 'זמינות שבועית', to: '/app/volunteer/availability'},
            {label: 'בקשה נכנסת', to: '/app/volunteer/incoming-request'},
            {label: 'מסלול פעיל', to: '/app/volunteer/active-route'},
            {label: 'היסטוריית שיבוצים', to: '/app/volunteer/history'},
            {label: 'דירוגים', to: '/app/volunteer/ratings'},
            {label: 'תגובות', to: '/app/volunteer/comments'}
        ]
    },
    {
        title: 'אזור ספק / עסק',
        items: [
            {label: 'דשבורד ספק', to: '/app/supplier/dashboard'},
            {label: 'יצירת תרומה', to: '/app/supplier/create-donation'},
            {label: 'תרומות פתוחות', to: '/app/supplier/open-donations'},
            {label: 'היסטוריית ספק', to: '/app/supplier/history'},
            {label: 'תגובות ספק', to: '/app/supplier/comments'}
        ]
    },
    {
        title: 'אזור עמותה',
        items: [
            {label: 'דשבורד עמותה', to: '/app/ngo/dashboard'},
            {label: 'הרשמת עמותה', to: '/app/ngo/register'},
            {label: 'שעות פעילות', to: '/app/ngo/hours'},
            {label: 'תרומות נכנסות', to: '/app/ngo/incoming'},
            {label: 'אישור קבלה', to: '/app/ngo/confirm'},
            {label: 'היסטוריית עמותה', to: '/app/ngo/history'},
            {label: 'דירוגי עמותה', to: '/app/ngo/ratings'},
            {label: 'תגובות עמותה', to: '/app/ngo/comments'}
        ]
    },
    {
        title: 'ניהול מערכת',
        items: [
            {label: 'דשבורד ניהול', to: '/app/admin/dashboard'},
            {label: 'אישור משתמשים', to: '/app/admin/approvals'},
            {label: 'ניהול משתמשים', to: '/app/admin/users'},
            {label: 'ניהול מתנדבים', to: '/app/admin/volunteers'},
            {label: 'ניהול תרומות', to: '/app/admin/donations'},
            {label: 'ניטור שידוכים', to: '/app/admin/matching'},
            {label: 'ניהול מסלולים', to: '/app/admin/routes'},
            {label: 'טיפול ב-No-Show', to: '/app/admin/noshow'},
            {label: 'דוחות', to: '/app/admin/reports'},
            {label: 'מודרציית תגובות', to: '/app/admin/comments'},
            {label: 'הגדרות', to: '/app/admin/settings'}
        ]
    },
    {
        title: 'מפה ומסלולים',
        items: [
            {label: 'מפה כללית', to: '/app/map'},
            {label: 'תכנון מסלול VRP', to: '/app/vrp-route'}
        ]
    }
];

export const SOCIALS: SocialLink[] = [
    {label: 'WhatsApp', short: 'WA', href: '/contact'},
    {label: 'Instagram', short: 'IG', href: '/contact'},
    {label: 'Pinterest', short: 'PI', href: '/contact'},
    {label: 'YouTube', short: 'YT', href: '/contact'},
    {label: 'Facebook', short: 'FB', href: '/contact'}
];

export const SCENES: Scenes = {
    heart: {
        id: 'community',
        variant: 'heart',
        maxScale: 14,
        beat: true,
        title: 'הלב הפועם של הקהילה'
    },
    car: {
        title: 'יש לך רכב? הגיע הזמן לרתום אותו לעשיית טוב אמיתית!',
        text: 'אסוף עודפי מזון ועזור להביא ארוחות חמות למשפחות הנזקקות.'
    },
    basket: {
        id: 'donate',
        variant: 'basket',
        maxScale: 24,
        minScale: 0.3,
        darkFlood: true,
        title: 'יש לך עודפי מזון מאירוע, עסק או בית?',
        text: 'אל תיתן להם להתבזבז. מלא את הפרטים ונבוא לאסוף אותם באהבה עבור מי שזקוק לכך.'
    }
};

export const MAP_OUTLINE: string = 'M90 6 102 26 98 48 112 66 104 92 116 116 112 146 122 172 116 206 '
    + '106 250 96 300 86 352 80 408 64 330 48 250 34 196 30 180 38 156 48 128 58 100 68 70 78 40 84 20Z';

export const MAP_PLACES: MapPlace[] = [
    {name: 'טבריה', x: 103, y: 76, anchor: 'start', dx: 7},
    {name: 'חיפה', x: 66, y: 92, anchor: 'end', dx: -7},
    {name: 'תל אביב', x: 48, y: 140, anchor: 'end', dx: -7},
    {name: 'ירושלים', x: 86, y: 168, anchor: 'start', dx: 7},
    {name: 'באר שבע', x: 58, y: 214, anchor: 'end', dx: -7},
    {name: 'אילת', x: 78, y: 392, anchor: 'end', dx: -7}
];

export const MAP_ROUTES: MapRoute[] = [
    {from: [103, 76], to: [66, 92], bow: 12},
    {from: [66, 92], to: [48, 140], bow: 16},
    {from: [48, 140], to: [86, 168], bow: -15},
    {from: [86, 168], to: [58, 214], bow: 14},
    {from: [58, 214], to: [78, 392], bow: 34}
];

export const EYES_SCENE: CaptionConfig = {
    title: 'פותחים את העיניים לערבות הדדית'
};

export const STATS: StatItem[] = [
    {value: 306, suffix: '+', label: 'עסקים שותפים לעשייה'},
    {value: 1020, suffix: '+', label: 'מתנדבים פעילים עם לב ענק'},
    {value: 12750, suffix: '+', label: 'ארוחות שהצלנו החודש'}
];