import {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PageTitle from '../components/PageTitle';
import {EmptyState, LoadingBlock} from '../components/PageParts';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import LiveRouteMap from '../components/LiveRouteMap';
import {useAutoRefresh, useLiveUpdates} from '../components/LiveUpdates';
import {RESPONSE_WINDOW_CODES} from '../utils/apiError';
import {errorMessage, toErrorPayload} from '../api/http';
import type {ApiErrorPayload} from '../api/http';
import {useAppDispatch, useAppSelector} from '../store';
import {fetchIncomingRequest, incomingCleared, respondToRequest, selectIncoming} from '../store/volunteerSlice';
import type {RouteDto} from '../types/api';

type Notice = {text: string; severity: 'success' | 'info' | 'error'};

// סטטוסים של תחנה אחרי שהמתנדב אישר את המסלול
const ACCEPTED_STATUSES = ['Confirmed', 'InPickup', 'InTransit', 'Delivered', 'Completed'];
const isAccepted = (route: RouteDto) => route.stops.some((s) => ACCEPTED_STATUSES.includes(s.status));

// בקשת התנדבות נכנסת (למתנדב מחובר). הבקשה היא מסלול שלם - אישור או דחייה אחת לכל התחנות.
// (קישור מהמייל, בלי התחברות, מגיע לעמוד /app/respond)
export function IncomingRequestPage() {
    const {id} = useParams<{id?: string}>();
    const navigate = useNavigate();
    const {refresh} = useLiveUpdates();
    const dispatch = useAppDispatch();
    const incoming = useAppSelector(selectIncoming);
    // נתונים של בקשה אחרת (כתובת קודמת) לא מוצגים - עד שהבקשה הזו נטענת
    const current = incoming.key === (id ?? 'active');
    const route = current ? incoming.data : null;
    const loading = !current || incoming.status === 'idle' || incoming.status === 'loading';
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<Notice | null>(null);
    // תיקון 13: הספירה לאחור הגיעה ל-0 - הכפתורים נעלמים מיד. בעבר הדף נטען מחדש כל שנייה ("לולאה"),
    // והכפתורים נשארו עד שהשרת סימן את הבקשה, כך שנראה שאפשר לאשר גם אחרי 5 הדקות.
    const [expiredRouteId, setExpiredRouteId] = useState<number | null>(null);

    // silent: רענון ברקע (תיקון 45 - למשל אחרי שהמתנדב ענה מהקישור במייל) - בלי להחליף את הדף בסמל טעינה
    const load = useCallback(async (silent = false) => {
        try {
            await dispatch(fetchIncomingRequest({id, silent})).unwrap();
        } catch (err) {
            if (!silent) setMessage({text: errorMessage(err, 'שגיאה בטעינת הבקשה.'), severity: 'error'});
        }
    }, [id, dispatch]);

    useEffect(() => {
        void load();
    }, [load]);

    // תיקון 45: אם הבקשה נענתה במקום אחר (הקישור במייל, מכשיר אחר) - הדף מתעדכן לבד
    useAutoRefresh(() => void load(true), 20_000);

    const handleExpire = useCallback(() => {
        setExpiredRouteId(route?.id ?? null);
        // השרת מעביר את הבקשה למתנדב הבא תוך שניות - טוענים פעם אחת את המצב המעודכן
        window.setTimeout(() => void load(), 3000);
    }, [route?.id, load]);

    const respond = async (accept: boolean) => {
        if (!route || route.stops.length === 0) return;
        if (!accept && !window.confirm('לדחות את הבקשה? התרומות יועברו למתנדב אחר.')) return;

        setBusy(true);
        setMessage(null);
        const firstMatchId = route.stops[0].matchId;
        let failure: ApiErrorPayload | null = null;
        try {
            await dispatch(respondToRequest({matchId: firstMatchId, accept})).unwrap();
        } catch (err) {
            failure = toErrorPayload(err, 'הפעולה נכשלה.');
        }
        setBusy(false);
        // הפס "מחכה לך בקשה" בשאר הדפים מתעדכן מיד
        refresh();

        if (failure) {
            // תיקון 12: למשל אחרי שזמן התגובה עבר - הודעה ברורה מהשרת (ולא "נפילה" או שגיאה אדומה)
            const {message: text, code} = failure;
            setMessage({text, severity: code && RESPONSE_WINDOW_CODES.includes(code) ? 'info' : 'error'});
            await load();
            return;
        }

        if (accept) {
            navigate('/app/volunteer/active-route');
        } else {
            setMessage({text: 'הבקשה נדחתה. תודה על העדכון!', severity: 'success'});
            dispatch(incomingCleared());
        }
    };

    if (loading) return <LoadingBlock text="טוען את הבקשה..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="בקשת איסוף נכנסת" />
            {message && <Alert severity={message.severity} sx={{mb: 2}}>{message.text}</Alert>}

            {!route ? (
                // תיקון 76: מסך ריק עם הצעד הבא
                <EmptyState
                    icon={<NotificationsActiveOutlinedIcon />}
                    title="אין כרגע בקשות שממתינות לך"
                    text="כשהמנוע ימצא לך מסלול, הבקשה תופיע כאן מיד וגם במייל. בקשות נשלחות רק בשעות שסומנו בזמינות השבועית, ולכן כדאי לוודא שהיא מעודכנת."
                    action={{label: 'עדכון הזמינות השבועית', to: '/app/volunteer/availability'}}
                    secondaryAction={{label: 'ללוח הבקרה', to: '/app/volunteer/dashboard'}}
                />
            ) : !route.awaitingResponse ? (
                // תוקן: בקשה שזמן התגובה שלה עבר הוצגה בעבר כ"המסלול כבר אושר"
                isAccepted(route) ? (
                    <Stack spacing={2}>
                        <Alert severity="info">המסלול כבר אושר.</Alert>
                        <Button variant="contained" onClick={() => navigate('/app/volunteer/active-route')}>למסלול הפעיל</Button>
                    </Stack>
                ) : (
                    !message && (
                        <Alert severity="info">
                            הבקשה הזו כבר לא ממתינה לתגובה: זמן התגובה הסתיים או שהיא נדחתה, והיא הועברה למתנדב אחר.
                        </Alert>
                    )
                )
            ) : expiredRouteId === route.id ? (
                <Alert severity="info">זמן התגובה הסתיים, והבקשה עוברת עכשיו למתנדב הבא. תודה על הנכונות!</Alert>
            ) : (
                <Stack spacing={2}>
                    <Box><DeadlineCountdown deadline={route.responseDeadline} secondsLeft={route.responseSecondsLeft} onExpire={handleExpire} /></Box>
                    {/* תיקון 45: אותה בקשה נשלחה גם במייל - התשובה הראשונה (כאן או מהמייל) היא שנקבעת */}
                    <Alert severity="info" variant="outlined">
                        אפשר לאשר כאן או מהקישור שנשלח אליך במייל - התשובה הראשונה היא שנקבעת, והקישור השני כבר לא יהיה פעיל.
                    </Alert>
                    {/* תיקון 35: המסלול על מפה דינאמית (הזזה וזום) כבר לפני האישור - תחנות האיסוף לפי הסדר והעמותה */}
                    <LiveRouteMap route={route} height={340} fallbackSrc={`/api/map/routes/${route.id}/image`} />
                    <RouteSummary route={route} />
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                        <Button variant="contained" size="large" startIcon={<CheckIcon />} disabled={busy} onClick={() => void respond(true)}>
                            מאשר/ת את כל המסלול
                        </Button>
                        <Button variant="outlined" color="error" size="large" startIcon={<CloseIcon />} disabled={busy} onClick={() => void respond(false)}>
                            לא יכול/ה הפעם
                        </Button>
                    </Stack>
                </Stack>
            )}
        </Box>
    );
}
