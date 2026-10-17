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
import {readErrorMessage} from '../utils/apiError';
import type {MatchResponseDto, RouteDto} from '../types/api';

// בקשת התנדבות נכנסת (למתנדב מחובר). הבקשה היא מסלול שלם - אישור או דחייה אחת לכל התחנות.
// (קישור מהמייל, בלי התחברות, מגיע לעמוד /app/respond)
export function IncomingRequestPage() {
    const {id} = useParams<{id?: string}>();
    const navigate = useNavigate();
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{text: string; ok: boolean} | null>(null);

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
            setMessage({text: err instanceof Error ? err.message : 'שגיאה בטעינת הבקשה.', ok: false});
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

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
            setMessage({text: await readErrorMessage(res, 'הפעולה נכשלה.'), ok: false});
            await load();
            return;
        }

        if (accept) {
            navigate('/app/volunteer/active-route');
        } else {
            setMessage({text: 'הבקשה נדחתה. תודה על העדכון!', ok: true});
            setRoute(null);
        }
    };

    if (loading) return <LoadingBlock text="טוען את הבקשה..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="בקשת איסוף נכנסת" />
            {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{mb: 2}}>{message.text}</Alert>}

            {!route ? (
                <EmptyState text="אין כרגע בקשות איסוף שממתינות לך." />
            ) : !route.awaitingResponse ? (
                <Stack spacing={2}>
                    <Alert severity="info">המסלול כבר אושר.</Alert>
                    <Button variant="contained" onClick={() => navigate('/app/volunteer/active-route')}>למסלול הפעיל</Button>
                </Stack>
            ) : (
                <Stack spacing={2}>
                    <Box><DeadlineCountdown deadline={route.responseDeadline} onExpire={() => void load()} /></Box>
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
