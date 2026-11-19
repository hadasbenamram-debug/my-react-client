import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {DeadlineCountdown} from './RouteSummary';
import {getToken, otherRoleForPath, switchRole} from '../utils/auth';
import {formatTime} from '../utils/format';
import type {NotificationDto, RouteDto} from '../types/api';
import {useAppDispatch, useAppSelector} from '../store';
import {selectIsLoggedIn, selectIsVolunteer} from '../store/authSlice';
import {
    allMarkedRead,
    fetchPendingOffer,
    fetchUnreadCount,
    notificationReceived,
    selectPendingOffer,
    selectUnread,
    selectVersion,
    versionBumped,
} from '../store/liveUpdatesSlice';

/**
 * תיקונים 45 + 50: עדכונים חיים בכל האתר.
 *
 * חיבור SignalR אחד לכל האתר (ולא חיבור נפרד בכל דף): כל התראה מהשרת מוצגת מיד בהודעה קופצת, מעדכנת את
 * מספר ההתראות שלא נקראו בפעמון שבכותרת, ומרעננת את הדשבורדים (useAutoRefresh). גם בלי SignalR (רשת חסומה,
 * חיבור שנפל) הדשבורדים מתרעננים לבד כל דקה, וכשחוזרים ללשונית.
 *
 * מתנדב (תיקון 45): בקשת איסוף חדשה מוצגת באתר עצמו - חלון קופץ מכל דף שבו הוא נמצא, ופס קבוע בראש הדפים
 * עם הזמן שנשאר לאישור. המצב נלקח תמיד מהשרת (routes/my-active), ולכן אין התנגשות עם המייל: אם המתנדב ענה
 * מהקישור במייל - הבקשה נעלמת מהאתר בבדיקה הבאה; אם ענה באתר - הקישור במייל כבר לא פעיל, ועמוד הקישור אומר לו
 * שהבקשה כבר נענתה (RespondByLinkPage). בשני המקרים השרת מקבל תשובה אחת בלבד.
 */
export interface LiveUpdatesValue {
    /** כמה התראות לא נקראו (לפעמון בכותרת) */
    unread: number;
    /** משתנה בכל אירוע מהשרת (התראה חדשה / חיבור מחדש) - דפים טוענים את הנתונים מחדש */
    version: number;
    /** מתנדב: בקשת איסוף שממתינה לתשובה שלו (null = אין) */
    pendingOffer: RouteDto | null;
    /** בדיקה מחודשת מול השרת (למשל אחרי שהמתנדב אישר או דחה בקשה) */
    refresh: () => void;
    /** מרכז ההתראות סימן הכול כנקרא */
    markAllRead: () => void;
    /** האזנה להתראות חדשות (מחזיר פונקציה להפסקת ההאזנה) */
    subscribe: (handler: (notification: NotificationDto) => void) => () => void;
}

// מאזינים להתראות חדשות. פונקציות אינן ניתנות לסריאליזציה ולכן אינן נשמרות ב-Redux
type NotificationHandler = (notification: NotificationDto) => void;
const listeners = new Set<NotificationHandler>();

const subscribe = (handler: NotificationHandler): (() => void) => {
    listeners.add(handler);
    return () => {
        listeners.delete(handler);
    };
};

/** המצב החי מתוך ה-store (unread / version / pendingOffer) + פעולות */
export const useLiveUpdates = (): LiveUpdatesValue => {
    const dispatch = useAppDispatch();
    const unread = useAppSelector(selectUnread);
    const version = useAppSelector(selectVersion);
    const pendingOffer = useAppSelector(selectPendingOffer);

    // version חדש -> הבקשה הממתינה (למתנדב) והדפים הפתוחים נטענים מחדש
    const refresh = useCallback(() => {
        void dispatch(fetchUnreadCount());
        dispatch(versionBumped());
    }, [dispatch]);

    const markAllRead = useCallback(() => {
        dispatch(allMarkedRead());
    }, [dispatch]);

    return useMemo(
        () => ({unread, version, pendingOffer, refresh, markAllRead, subscribe}),
        [unread, version, pendingOffer, refresh, markAllRead],
    );
};

const OFFER_PATH = '/app/volunteer/incoming-request';
const OFFER_POLL_MS = 30_000;
// דפים שכבר מציגים את הבקשה הממתינה בעצמם - בלי פס כפול
const SHOWS_OFFER_ITSELF = [OFFER_PATH, '/app/volunteer/dashboard', '/app/volunteer/active-route'];

const SEVERITY: Record<string, 'success' | 'info' | 'warning' | 'error'> = {
    success: 'success',
    warning: 'warning',
    request: 'info',
    info: 'info',
};

/** מעבר לקישור של התראה. קישור למסך של תפקיד אחר באותו חשבון - מעבר לתפקיד הזה (כמו בתפריט) */
export function useOpenLink(): (link: string) => void {
    const navigate = useNavigate();
    return useCallback((link: string) => {
        const role = otherRoleForPath(link);
        if (role) switchRole(role, link);
        else navigate(link);
    }, [navigate]);
}

export interface LiveUpdatesProviderProps {
    children: ReactNode;
}

export function LiveUpdatesProvider({children}: LiveUpdatesProviderProps) {
    const location = useLocation();
    const openLink = useOpenLink();
    const dispatch = useAppDispatch();
    const {version, pendingOffer, refresh} = useLiveUpdates();
    // הודעה קופצת וחלון הבקשה - מצב תצוגה מקומי של הרכיב הזה בלבד
    const [toast, setToast] = useState<NotificationDto | null>(null);
    const [offerDialog, setOfferDialog] = useState<RouteDto | null>(null);
    // בקשות שכבר הוצגו בחלון קופץ - לא קופצים שוב על אותה בקשה בכל בדיקה
    const shownOffers = useRef(new Set<number>());
    const loggedIn = useAppSelector(selectIsLoggedIn);
    const volunteer = useAppSelector(selectIsVolunteer);

    const loadUnread = useCallback(() => {
        void dispatch(fetchUnreadCount());
    }, [dispatch]);

    const loadOffer = useCallback(() => {
        void dispatch(fetchPendingOffer());
    }, [dispatch]);

    // חיבור אחד לכל האתר (רק למשתמש מחובר)
    useEffect(() => {
        if (!loggedIn) return;
        loadUnread();

        const connection = new signalR.HubConnectionBuilder()
            .withUrl('/notificationHub', {accessTokenFactory: () => getToken() ?? ''})
            .withAutomaticReconnect()
            .build();

        connection.on('ReceiveNotification', (notification: NotificationDto) => {
            // בקשת איסוף חדשה מוצגת בחלון משלה (למטה) - לא גם בהודעה קופצת
            if (!notification.link?.startsWith(OFFER_PATH)) setToast(notification);
            listeners.forEach((handler) => handler(notification));
            dispatch(notificationReceived());
        });
        // אחרי ניתוק אפשר היה לפספס אירועים - טוענים הכול מחדש
        connection.onreconnected(() => {
            loadUnread();
            dispatch(versionBumped());
        });

        connection.start().catch((error: unknown) => console.warn('SignalR connection error', error));
        return () => {
            void connection.stop();
        };
    }, [loggedIn, loadUnread, dispatch]);

    // מתנדב: הבקשה הממתינה - בכל אירוע מהשרת, כל 30 שניות, וכשחוזרים ללשונית
    useEffect(() => {
        if (!volunteer) return;
        loadOffer();
    }, [volunteer, version, loadOffer]);

    useEffect(() => {
        if (!volunteer) return;
        const tick = () => {
            if (document.visibilityState === 'visible') loadOffer();
        };
        const timer = window.setInterval(tick, OFFER_POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [volunteer, loadOffer]);

    // בקשה חדשה -> חלון קופץ (חוץ מכשכבר נמצאים בעמוד הבקשה)
    useEffect(() => {
        if (!pendingOffer) {
            setOfferDialog(null);
            return;
        }
        if (shownOffers.current.has(pendingOffer.id)) return;
        shownOffers.current.add(pendingOffer.id);
        if (!location.pathname.startsWith(OFFER_PATH)) setOfferDialog(pendingOffer);
    }, [pendingOffer, location.pathname]);

    // יציבה בין רינדורים - אחרת הספירה לאחור (DeadlineCountdown) מתחילה מחדש בכל רינדור
    const refreshSoon = useCallback(() => {
        window.setTimeout(refresh, 3000);
    }, [refresh]);

    const goToOffer = () => {
        setOfferDialog(null);
        openLink(OFFER_PATH);
    };

    return (
        <>
            {children}

            {/* הודעה קופצת על כל התראה חדשה מהשרת */}
            <Snackbar
                open={toast !== null}
                autoHideDuration={8000}
                onClose={(_, reason) => {
                    if (reason !== 'clickaway') setToast(null);
                }}
                anchorOrigin={{vertical: 'top', horizontal: 'center'}}
                sx={{top: {xs: 76, md: 88}}}
            >
                <Alert
                    severity={toast ? SEVERITY[toast.type] ?? 'info' : 'info'}
                    onClose={() => setToast(null)}
                    sx={{width: '100%', maxWidth: 520, alignItems: 'center', boxShadow: 6, border: '1px solid', borderColor: 'divider'}}
                    action={toast?.link && toast.link.startsWith('/') ? (
                        <Button color="inherit" size="small" sx={{px: 1.5}} onClick={() => {
                            const link = toast.link!;
                            setToast(null);
                            openLink(link);
                        }}>
                            מעבר
                        </Button>
                    ) : undefined}
                >
                    <AlertTitle sx={{mb: toast?.content ? 0.25 : 0}}>{toast?.subject || 'התראה חדשה'}</AlertTitle>
                    {toast?.content}
                </Alert>
            </Snackbar>

            {/* מתנדב: בקשת איסוף חדשה - מכל דף באתר */}
            <Dialog open={offerDialog !== null} onClose={() => setOfferDialog(null)} fullWidth maxWidth="xs">
                <DialogTitle sx={{fontWeight: 700}}>בקשת איסוף חדשה</DialogTitle>
                <DialogContent>
                    {offerDialog && (
                        <Stack spacing={1.5}>
                            <Typography>
                                {offerDialog.stops.length === 1
                                    ? `איסוף מ${offerDialog.stops[0].supplierName ?? 'ספק'}`
                                    : `מסלול עם ${offerDialog.stops.length} תחנות איסוף`}
                                {' '}· {offerDialog.totalWeightKg.toFixed(1)} ק"ג אל {offerDialog.ngoName ?? 'עמותה'}
                            </Typography>
                            {offerDialog.scheduledAt && (
                                <Typography color="text.secondary" variant="body2">
                                    יציאה מתוכננת: {formatTime(offerDialog.scheduledAt)}
                                </Typography>
                            )}
                            <Box>
                                <DeadlineCountdown
                                    deadline={offerDialog.responseDeadline}
                                    secondsLeft={offerDialog.responseSecondsLeft}
                                    onExpire={refreshSoon}
                                />
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                אפשר לאשר כאן או מהקישור במייל - התשובה הראשונה היא שנקבעת.
                            </Typography>
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 2.5}}>
                    <Button onClick={() => setOfferDialog(null)}>אחר כך</Button>
                    <Button variant="contained" onClick={goToOffer}>לצפייה ואישור</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

/**
 * תיקון 50: רענון אוטומטי של דף (דשבורד / רשימה): בכל אירוע מהשרת, כל intervalMs (רק כשהלשונית גלויה),
 * וכשחוזרים ללשונית. load צריך לטעון "בשקט" - בלי להחליף את הדף בסמל טעינה.
 */
export function useAutoRefresh(load: () => void, intervalMs: number = 60_000): void {
    const {version} = useLiveUpdates();
    const loadRef = useRef(load);
    loadRef.current = load;
    const lastRun = useRef(Date.now());
    const firstVersion = useRef(version);

    const run = useCallback((force: boolean) => {
        // חזרה ללשונית + פוקוס יכולים להגיע יחד - לא טוענים פעמיים בתוך 5 שניות
        if (!force && Date.now() - lastRun.current < 5000) return;
        lastRun.current = Date.now();
        loadRef.current();
    }, []);

    // אירוע מהשרת (לא בטעינה הראשונה - הדף כבר טוען בעצמו)
    useEffect(() => {
        if (version === firstVersion.current) return;
        run(true);
    }, [version, run]);

    useEffect(() => {
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') run(true);
        }, intervalMs);
        const onReturn = () => {
            if (document.visibilityState === 'visible') run(false);
        };
        document.addEventListener('visibilitychange', onReturn);
        window.addEventListener('focus', onReturn);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onReturn);
            window.removeEventListener('focus', onReturn);
        };
    }, [intervalMs, run]);
}

/** פס קבוע בראש הדפים של המתנדב כשיש בקשת איסוף שממתינה לתשובה שלו (תיקון 45) */
export function PendingOfferBanner() {
    const {pendingOffer, refresh} = useLiveUpdates();
    const location = useLocation();
    const openLink = useOpenLink();
    // יציבה בין רינדורים - אחרת הספירה לאחור מתחילה מחדש בכל רינדור
    const refreshSoon = useCallback(() => {
        window.setTimeout(refresh, 3000);
    }, [refresh]);

    if (!pendingOffer || SHOWS_OFFER_ITSELF.some((path) => location.pathname.startsWith(path))) return null;

    return (
        <Alert
            severity="warning"
            sx={{mb: 3, alignItems: 'center', '& .MuiAlert-message': {width: '100%'}}}
            action={
                <Button color="inherit" variant="outlined" size="small" sx={{px: 2, whiteSpace: 'nowrap'}} onClick={() => openLink(OFFER_PATH)}>
                    לצפייה ואישור
                </Button>
            }
        >
            <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} sx={{alignItems: {sm: 'center'}}}>
                <Typography sx={{fontWeight: 700}}>מחכה לך בקשת איסוף חדשה</Typography>
                <DeadlineCountdown
                    deadline={pendingOffer.responseDeadline}
                    secondsLeft={pendingOffer.responseSecondsLeft}
                    onExpire={refreshSoon}
                />
            </Stack>
        </Alert>
    );
}
