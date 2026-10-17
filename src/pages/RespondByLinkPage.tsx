import {useEffect, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import PageTitle from '../components/PageTitle';
import {LoadingBlock} from '../components/PageParts';
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import {readErrorMessage} from '../utils/apiError';
import type {RouteDto} from '../types/api';

// הקישור מהמייל (/app/respond?token=...). עובד בלי התחברות.
// הטוקן חד-פעמי ומוגבל למסלול הזה בלבד - הוא לא טוקן התחברות ולא נשמר בדפדפן.
export function RespondByLinkPage() {
    const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState<string | null>(null);

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
                if (!res.ok) throw new Error(await readErrorMessage(res, 'הקישור אינו בתוקף.'));
                setRoute((await res.json()) as RouteDto);
            })
            .catch((err: unknown) => setError(err instanceof Error ? err.message : 'הקישור אינו בתוקף.'))
            .finally(() => setLoading(false));
    }, [token]);

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
            setError(await readErrorMessage(res, 'הפעולה נכשלה.'));
            return;
        }
        setRoute((await res.json()) as RouteDto);
        setDone(accept
            ? 'תודה! המסלול אושר. התחבר/י למערכת כדי לצאת לדרך ולעדכן איסוף ומסירה.'
            : 'הבקשה נדחתה והועברה למתנדב אחר. תודה על העדכון!');
    };

    if (loading) return <LoadingBlock text="טוען את הבקשה..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="בקשת התנדבות" />
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
            {done && <Alert severity="success" sx={{mb: 2}}>{done}</Alert>}

            {route && (
                <Stack spacing={2}>
                    {!done && route.awaitingResponse && (
                        <Box><DeadlineCountdown deadline={route.responseDeadline} /></Box>
                    )}
                    <RouteSummary route={route} />
                    {!done && route.awaitingResponse && (
                        <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                            <Button variant="contained" size="large" disabled={busy} onClick={() => void respond(true)}>
                                מאשר/ת את המסלול
                            </Button>
                            <Button variant="outlined" color="error" size="large" disabled={busy} onClick={() => void respond(false)}>
                                לא יכול/ה הפעם
                            </Button>
                        </Stack>
                    )}
                    {done && (
                        <Button variant="text" href="/app/login">להתחברות</Button>
                    )}
                </Stack>
            )}
        </Box>
    );
}
