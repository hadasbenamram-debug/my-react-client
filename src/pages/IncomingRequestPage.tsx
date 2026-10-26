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
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import {authHeaders} from '../utils/auth';
import {readApiError, readErrorMessage, RESPONSE_WINDOW_CODES} from '../utils/apiError';
import type {MatchResponseDto, RouteDto} from '../types/api';

type Notice = {text: string; severity: 'success' | 'info' | 'error'};

// סטטוסים של תחנה אחרי שהמתנדב אישר את המסלול
const ACCEPTED_STATUSES = ['Confirmed', 'InPickup', 'InTransit', 'Delivered', 'Completed'];
const isAccepted = (route: RouteDto) => route.stops.some((s) => ACCEPTED_STATUSES.includes(s.status));

// בקשת התנדבות נכנסת (למתנדב מחובר). הבקשה היא מסלול שלם - אישור או דחייה אחת לכל התחנות.
// (קישור מהמייל, בלי התחברות, מגיע לעמוד /app/respond)
export function IncomingRequestPage() {
    const {id} = useParams<{id?: string}>();
    const navigate = useNavigate();
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<Notice | null>(null);
    // תיקון 13: הספירה לאחור הגיעה ל-0 - הכפתורים נעלמים מיד. בעבר הדף נטען מחדש כל שנייה ("לולאה"),
    // והכפתורים נשארו עד שהשרת סימן את הבקשה, כך שנראה שאפשר לאשר גם אחרי 5 הדקות.
    const [expiredRouteId, setExpiredRouteId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            let next: RouteDto | null = null;
            if (id) {
                const matchRes = await fetch(`/api/matches/${id}`, {headers: authHeaders()});
                if (!matchRes.ok) throw new Error(await readErrorMessage(matchRes, 'הבקשה לא נמצאה.'));
                const match = (await matchRes.json()) as MatchResponseDto;
                if (match.volunteerRouteId) {
                    const routeRes = await fetch(`/api/matches/routes/${match.volunteerRouteId}`, {headers: authHeaders()});
                    if (routeRes.ok) next = (await routeRes.json()) as RouteDto;
                }
            } else {
                const res = await fetch('/api/matches/routes/my-active', {headers: authHeaders()});
                if (res.status === 200) next = (await res.json()) as RouteDto;
            }
            setRoute(next);
        } catch (err) {
            setMessage({text: err instanceof Error ? err.message : 'שגיאה בטעינת הבקשה.', severity: 'error'});
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

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
        const res = await fetch(`/api/matches/${firstMatchId}/${accept ? 'accept' : 'decline'}`, {
            method: 'POST',
            headers: authHeaders(),
        });
        setBusy(false);

        if (!res.ok) {
            // תיקון 12: למשל אחרי שזמן התגובה עבר - הודעה ברורה מהשרת (ולא "נפילה" או שגיאה אדומה)
            const {message: text, code} = await readApiError(res, 'הפעולה נכשלה.');
            setMessage({text, severity: code && RESPONSE_WINDOW_CODES.includes(code) ? 'info' : 'error'});
            await load();
            return;
        }

        if (accept) {
            navigate('/app/volunteer/active-route');
        } else {
            setMessage({text: 'הבקשה נדחתה. תודה על העדכון!', severity: 'success'});
            setRoute(null);
        }
    };

    if (loading) return <LoadingBlock text="טוען את הבקשה..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="בקשת איסוף נכנסת" />
            {message && <Alert severity={message.severity} sx={{mb: 2}}>{message.text}</Alert>}

            {!route ? (
                <EmptyState text="אין כרגע בקשות איסוף שממתינות לך." />
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
                    <Box><DeadlineCountdown deadline={route.responseDeadline} onExpire={handleExpire} /></Box>
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
