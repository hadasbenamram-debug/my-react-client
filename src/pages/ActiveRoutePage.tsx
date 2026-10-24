import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NavigationIcon from '@mui/icons-material/Navigation';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PageTitle from '../components/PageTitle';
import {EmptyState, LoadingBlock} from '../components/PageParts';
import RouteSummary from '../components/RouteSummary';
import {StaticMap} from '../components/GoogleMapView';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import type {RouteDto, RouteStopDto} from '../types/api';

const LOCATION_INTERVAL_MS = 20_000;

// המסלול הפעיל של המתנדב: יציאה לדרך -> איסוף בכל תחנה -> מסירה לעמותה.
// בזמן המסלול המיקום נשלח לשרת, והעמותה / הספק / המנהל רואים אותו בזמן אמת.
export function ActiveRoutePage() {
    const navigate = useNavigate();
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{text: string; ok: boolean} | null>(null);
    const [position, setPosition] = useState<{lat: number; lng: number} | null>(null);
    const lastSent = useRef(0);

    const load = useCallback(async () => {
        const res = await fetch('/api/matches/routes/my-active', {headers: authHeaders()});
        setRoute(res.status === 200 ? ((await res.json()) as RouteDto) : null);
        setLoading(false);
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // מיקום חי - רק כשהמסלול בביצוע
    useEffect(() => {
        if (!route || route.status !== 'InProgress' || !navigator.geolocation) return;

        const watchId = navigator.geolocation.watchPosition(
            (p) => {
                const pos = {lat: p.coords.latitude, lng: p.coords.longitude};
                setPosition(pos);
                if (Date.now() - lastSent.current < LOCATION_INTERVAL_MS) return;
                lastSent.current = Date.now();
                void fetch('/api/volunteers/me/location', {
                    method: 'PUT',
                    headers: authHeaders(true),
                    body: JSON.stringify({latitude: pos.lat, longitude: pos.lng}),
                });
            },
            (err) => console.warn('geolocation', err.message),
            {enableHighAccuracy: true}
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }, [route]);

    const act = async (url: string, success: string) => {
        setBusy(true);
        setMessage(null);
        const res = await fetch(url, {method: 'POST', headers: authHeaders()});
        setBusy(false);
        setMessage(res.ok ? {text: success, ok: true} : {text: await readErrorMessage(res, 'הפעולה נכשלה.'), ok: false});
        await load();
    };

    if (loading) return <LoadingBlock text="טוען את המסלול..." />;

    if (!route) {
        return (
            <Box sx={{maxWidth: 800, mx: 'auto'}}>
                <PageTitle eyebrow="מתנדב" title="מסלול פעיל" />
                {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{mb: 2}}>{message.text}</Alert>}
                <EmptyState text="אין מסלול פעיל כרגע." />
            </Box>
        );
    }

    if (route.awaitingResponse) {
        return (
            <Box sx={{maxWidth: 800, mx: 'auto'}}>
                <PageTitle eyebrow="מתנדב" title="מסלול פעיל" />
                <Alert severity="info" sx={{mb: 2}}>יש בקשה שממתינה לאישור שלך.</Alert>
                <Button variant="contained" onClick={() => navigate('/app/volunteer/incoming-request')}>לבקשה</Button>
            </Box>
        );
    }

    const nextPickup = route.stops.find((s) => s.status === 'Confirmed' || s.status === 'InPickup');
    const destination = nextPickup
        ? {label: `איסוף מ${nextPickup.supplierName ?? 'ספק'}`, lat: nextPickup.latitude, lng: nextPickup.longitude}
        : {label: `מסירה ל${route.ngoName ?? 'עמותה'}`, lat: route.ngoLatitude, lng: route.ngoLongitude};

    // קישור רשמי של Google Maps לניווט (לא צריך מפתח). בלי נקודת מוצא - Google מתחיל מהמיקום הנוכחי של הטלפון.
    const googleMapsNavigationUrl = 'https://www.google.com/maps/dir/?api=1'
        + (position ? `&origin=${position.lat},${position.lng}` : '')
        + `&destination=${destination.lat},${destination.lng}&travelmode=driving`;

    const stopActions = (stop: RouteStopDto) => {
        if (route.status !== 'InProgress') return null;
        if (stop.status === 'Confirmed' || stop.status === 'InPickup') {
            return (
                <Button size="small" variant="contained" disabled={busy}
                    onClick={() => void act(`/api/matches/${stop.matchId}/picked-up`, 'האיסוף נרשם.')}>
                    אספתי
                </Button>
            );
        }
        if (stop.status === 'InTransit') {
            return (
                <Button size="small" variant="contained" color="success" disabled={busy}
                    onClick={() => void act(`/api/matches/${stop.matchId}/complete`, 'המסירה נרשמה. העמותה תאשר את הקבלה.')}>
                    נמסר לעמותה
                </Button>
            );
        }
        return null;
    };

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="מסלול פעיל" />
            {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{mb: 2}}>{message.text}</Alert>}

            <Card sx={{p: {xs: 2.5, md: 3}, mb: 2}}>
                <Typography sx={{fontWeight: 700, mb: 1}}>היעד הבא: {destination.label}</Typography>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5}>
                    {route.status === 'Planned' && (
                        <Button variant="contained" startIcon={<PlayArrowIcon />} disabled={busy}
                            onClick={() => void act(`/api/matches/routes/${route.id}/start`, 'יצאת לדרך! המיקום שלך משותף עם המשתתפים במסלול.')}>
                            יציאה לדרך
                        </Button>
                    )}
                    <Button variant="outlined" startIcon={<NavigationIcon />}
                        href={`https://waze.com/ul?ll=${destination.lat},${destination.lng}&navigate=yes`} target="_blank" rel="noopener noreferrer">
                        ניווט ב-Waze
                    </Button>
                    <Button variant="outlined" startIcon={<NavigationIcon />}
                        href={googleMapsNavigationUrl} target="_blank" rel="noopener noreferrer">
                        ניווט ב-Google Maps
                    </Button>
                </Stack>
            </Card>

            {/* מפת המסלול מגיעה מהשרת כתמונה (Google Maps Static API - המפתח נשאר בשרת) */}
            <StaticMap src={`/api/map/routes/${route.id}/image`} alt="מפת המסלול" height={320} />

            <RouteSummary route={route} stopActions={stopActions} />
        </Box>
    );
}
