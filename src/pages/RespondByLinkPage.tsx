import {useCallback, useEffect, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageTitle from '../components/PageTitle';
import {LoadingBlock} from '../components/PageParts';
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import {readApiError, RESPONSE_WINDOW_CODES} from '../utils/apiError';
import {authHeaders, clearSession, getCurrentUser, getToken, saveSession} from '../utils/auth';
import type {RespondByLinkResultDto, RouteDto} from '../types/api';

const ACTIVE_ROUTE = '/app/volunteer/active-route';

// הקישור כבר לא פעיל כי הבקשה כבר נענתה (באתר / מהמייל) - לא כי הזמן עבר
const ALREADY_ANSWERED_CODES = ['LinkInvalid', 'NotAwaiting'];

type AfterAnswer = {text: string; path: string; button: string};

// הקישור מהמייל (/app/respond?token=...). עובד בלי התחברות.
// הטוקן חד-פעמי ומוגבל למסלול הזה בלבד - הוא לא טוקן התחברות ולא נשמר בדפדפן.
export function RespondByLinkPage() {
    const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    // תיקון 12: קישור שכבר לא בתוקף / זמן התגובה עבר - הודעה רגילה ולא שגיאה
    const [info, setInfo] = useState('');
    // תיקון 13: הספירה לאחור הגיעה ל-0 - הכפתורים נעלמים מיד (בעבר נשארו גם אחרי שהזמן נגמר)
    const [expired, setExpired] = useState(false);
    const handleExpire = useCallback(() => {
        setExpired(true);
        setInfo('זמן התגובה הסתיים, והבקשה עוברת עכשיו למתנדב הבא. תודה על הנכונות!');
    }, []);
    const [done, setDone] = useState<string | null>(null);
    // אחרי אישור: לאן ממשיכים (המסלול הפעיל), ואם צריך קודם להתחבר
    const [next, setNext] = useState<{path: string; needsLogin: boolean} | null>(null);

    // תיקון 45: הבקשה מוצגת גם באתר. מי שכבר ענה שם ולוחץ אחר כך על הקישור במייל - מקבל הסבר ברור
    // (ולא רק "הקישור לא בתוקף"), ואם הוא מחובר במכשיר הזה - כפתור ישר למצב העדכני שלו.
    const [after, setAfter] = useState<AfterAnswer | null>(null);
    const explainAlreadyAnswered = useCallback(async () => {
        const volunteerHere = !!getToken() && String(getCurrentUser().role || '').toLowerCase().includes('volunt');
        if (!volunteerHere) {
            setAfter({
                text: 'אם כבר ענית לבקשה באתר - אין צורך לעשות דבר נוסף. את המצב העדכני אפשר לראות באזור האישי.',
                path: `/app/login?returnTo=${encodeURIComponent('/app/volunteer/dashboard')}`,
                button: 'כניסה לאזור האישי',
            });
            return;
        }
        const res = await fetch('/api/matches/routes/my-active', {headers: authHeaders()}).catch(() => null);
        const active = res && res.status === 200 ? ((await res.json()) as RouteDto) : null;
        if (active && !active.awaitingResponse) {
            setAfter({text: 'הבקשה כבר אושרה באתר - המסלול שלך פעיל.', path: ACTIVE_ROUTE, button: 'למסלול שלי'});
        } else if (active) {
            setAfter({text: 'מחכה לך באתר בקשת איסוף אחרת.', path: '/app/volunteer/incoming-request', button: 'לבקשה הממתינה'});
        } else {
            setAfter({text: 'אם כבר ענית לבקשה באתר - אין צורך לעשות דבר נוסף.', path: '/app/volunteer/dashboard', button: 'לאזור האישי'});
        }
    }, []);

    useEffect(() => {
        // הטוקן לא נשאר בשורת הכתובת (היסטוריה / שיתוף מסך)
        window.history.replaceState({}, document.title, window.location.pathname);

        if (!token) {
            setError('הקישור אינו תקין.');
            setLoading(false);
            return;
        }

        fetch('/api/matches/by-link', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token, accept: false}),
        })
            .then(async (res) => {
                if (!res.ok) {
                    const {message, code} = await readApiError(res, 'הקישור אינו בתוקף.');
                    if (code && RESPONSE_WINDOW_CODES.includes(code)) {
                        setInfo(message);
                        if (ALREADY_ANSWERED_CODES.includes(code)) void explainAlreadyAnswered();
                        return;
                    }
                    throw new Error(message);
                }
                setRoute((await res.json()) as RouteDto);
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'הקישור אינו בתוקף.'))
            .finally(() => setLoading(false));
    }, [token, explainAlreadyAnswered]);

    const respond = async (accept: boolean) => {
        setBusy(true);
        setError('');
        const res = await fetch('/api/matches/respond-by-link', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({token, accept}),
        });
        setBusy(false);

        if (!res.ok) {
            const {message, code} = await readApiError(res, 'הפעולה נכשלה.');
            if (code && RESPONSE_WINDOW_CODES.includes(code)) {
                // למשל אחרי שזמן התגובה עבר: הבקשה הועברה למתנדב אחר - כבר אין מה לאשר
                setInfo(message);
                setRoute((r) => (r ? {...r, awaitingResponse: false} : r));
                if (ALREADY_ANSWERED_CODES.includes(code)) void explainAlreadyAnswered();
            } else {
                setError(message);
            }
            return;
        }
        const result = (await res.json()) as RespondByLinkResultDto;
        setRoute(result.route);

        if (!accept) {
            setDone('הבקשה נדחתה והועברה למתנדב אחר. תודה על העדכון!');
            return;
        }

        // תיקון 11: בעבר אחרי האישור הופיע רק "התחבר/י למערכת". עכשיו השרת מחזיר כניסה למערכת (הקישור אישי
        // וחד-פעמי), וממשיכים ישר למסלול הפעיל - שם יוצאים לדרך ומעדכנים איסוף ומסירה.
        const path = result.nextPath || ACTIVE_ROUTE;
        if (result.session) {
            clearSession();   // כניסה חדשה של המתנדב (גם אם במכשיר היה מחובר מישהו אחר)
            saveSession(result.session);
            setNext({path, needsLogin: false});
            setDone('תודה! המסלול אושר. מעבירים אותך למסלול שלך...');
            setTimeout(() => window.location.assign(path), 1500);
        } else {
            setNext({path, needsLogin: true});
            setDone('תודה! המסלול אושר. כדי לצאת לדרך צריך להתחבר פעם אחת, ומשם ממשיכים ישר למסלול.');
        }
    };

    if (loading) return <LoadingBlock text="טוען את הבקשה..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="בקשת התנדבות" />
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
            {info && <Alert severity="info" sx={{mb: 2}}>{info}</Alert>}
            {after && (
                <Alert severity="success" variant="outlined" sx={{mb: 2, alignItems: 'center'}}
                    action={<Button color="inherit" size="small" sx={{px: 2}} href={after.path}>{after.button}</Button>}>
                    {after.text}
                </Alert>
            )}
            {done && <Alert severity="success" sx={{mb: 2}}>{done}</Alert>}

            {route && (
                <Stack spacing={2}>
                    {!done && !expired && route.awaitingResponse && (
                        <Box><DeadlineCountdown deadline={route.responseDeadline} secondsLeft={route.responseSecondsLeft} onExpire={handleExpire} /></Box>
                    )}
                    <RouteSummary route={route} />
                    {!done && !expired && route.awaitingResponse && (
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                            <Button variant="contained" size="large" disabled={busy} onClick={() => void respond(true)}>
                                מאשר/ת את המסלול
                            </Button>
                            <Button variant="outlined" color="error" size="large" disabled={busy} onClick={() => void respond(false)}>
                                לא יכול/ה הפעם
                            </Button>
                        </Stack>
                    )}
                    {done && next && (
                        <Box>
                            <Button variant="contained"
                                href={next.needsLogin ? `/app/login?returnTo=${encodeURIComponent(next.path)}` : next.path}>
                                {next.needsLogin ? 'להתחברות ולמסלול' : 'למסלול שלי'}
                            </Button>
                        </Box>
                    )}
                </Stack>
            )}
        </Box>
    );
}
