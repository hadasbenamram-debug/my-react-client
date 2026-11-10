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
import LiveRouteMap from '../components/LiveRouteMap';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import type {RouteDto, RouteStopDto} from '../types/api';

// כל 10 שניות - כך העמותה רואה את המתנדב זז על המפה כמעט בזמן אמת (השרת שומר לכל היותר רישום אחד ל-8 שניות)
const LOCATION_INTERVAL_MS = 10_000;

/**
 * תיקון 34: מצב שיתוף המיקום - מוצג למתנדב. בעבר כל תקלה (הדפדפן חוסם מיקום, אתר שלא ב-https, שגיאת שרת)
 * נרשמה רק ב-console, המתנדב לא ידע שהעמותה לא רואה אותו, ויומן המשלוח (DeliveryLogs) נשאר ריק.
 */
type LocationShare =
    | {state: 'off'}
    | {state: 'waiting'}
    | {state: 'sharing'; at: number}
    | {state: 'error'; text: string};

const geolocationErrorText = (err: GeolocationPositionError): string => {
    if (err.code === err.PERMISSION_DENIED) {
        return 'הדפדפן חוסם את הגישה למיקום, ולכן העמותה לא רואה אותך על המפה. אשר/י גישה למיקום לאתר (בהגדרות האתר בדפדפן) ורענן/י את הדף.';
    }
    if (err.code === err.POSITION_UNAVAILABLE) {
        return 'לא ניתן לקבל מיקום כרגע (ה-GPS כבוי או שאין קליטה). ננסה שוב אוטומטית.';
    }
    return 'קבלת המיקום מהמכשיר לוקחת יותר מדי זמן. ננסה שוב אוטומטית.';
};

// המסלול הפעיל של המתנדב: יציאה לדרך -> איסוף בכל תחנה -> מסירה לעמותה.
// בזמן המסלול המיקום נשלח לשרת ונרשם ביומן המשלוח, והעמותה / הספק / המנהל רואים אותו בזמן אמת.
// לפני היציאה לדרך המיקום לא נשלח.
export function ActiveRoutePage() {
    const navigate = useNavigate();
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{text: string; ok: boolean} | null>(null);
    const [position, setPosition] = useState<{lat: number; lng: number} | null>(null);
    const [share, setShare] = useState<LocationShare>({state: 'off'});
    const lastSent = useRef(0);
    const latest = useRef<{lat: number; lng: number} | null>(null);

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
        if (!route || route.status !== 'InProgress') {
            setShare({state: 'off'});
            return;
        }
        // הדפדפן נותן מיקום רק באתר מאובטח: https, או localhost בזמן פיתוח (לא http://192.168...)
        if (!window.isSecureContext) {
            setShare({
                state: 'error',
                text: 'הדפדפן מאפשר שיתוף מיקום רק באתר מאובטח (https) או בכתובת localhost, ולכן העמותה לא רואה אותך על המפה. יש לפתוח את האתר בכתובת מאובטחת.',
            });
            return;
        }
        if (!navigator.geolocation) {
            setShare({state: 'error', text: 'הדפדפן הזה לא תומך בשיתוף מיקום, ולכן העמותה לא רואה אותך על המפה.'});
            return;
        }
        // אחרי פעולה (למשל "אספתי") המסלול נטען מחדש - לא מציגים שוב "ממתינים" אם המיקום כבר משותף
        setShare((prev) => (prev.state === 'sharing' ? prev : {state: 'waiting'}));

        const send = () => {
            const pos = latest.current;
            if (!pos || Date.now() - lastSent.current < LOCATION_INTERVAL_MS - 500) return;
            lastSent.current = Date.now();
            fetch('/api/volunteers/me/location', {
                method: 'PUT',
                headers: authHeaders(true),
                body: JSON.stringify({latitude: pos.lat, longitude: pos.lng}),
            })
                .then((res) => {
                    setShare(res.ok
                        ? {state: 'sharing', at: Date.now()}
                        : {state: 'error', text: `המיקום לא נשמר בשרת (שגיאה ${res.status}). ננסה שוב בעוד כמה שניות.`});
                })
                .catch(() => setShare({state: 'error', text: 'אין חיבור לשרת, ולכן המיקום לא נשלח. ננסה שוב בעוד כמה שניות.'}));
        };

        const watchId = navigator.geolocation.watchPosition(
            (p) => {
                const pos = {lat: p.coords.latitude, lng: p.coords.longitude};
                latest.current = pos;
                setPosition(pos);
                send();
            },
            (err) => {
                console.warn('geolocation', err.message);
                setShare({state: 'error', text: geolocationErrorText(err)});
            },
            {enableHighAccuracy: true, maximumAge: 5000}
        );

        // גם כשהמתנדב עומד במקום (למשל ממתין באיסוף) - העמותה רואה שהמיקום עדכני
        const heartbeat = window.setInterval(send, LOCATION_INTERVAL_MS);

        return () => {
            navigator.geolocation.clearWatch(watchId);
            window.clearInterval(heartbeat);
        };
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

            {/* תיקון 34: המתנדב רואה אם המיקום שלו באמת משותף (ומה לעשות כשלא) */}
            {share.state === 'waiting' && (
                <Alert severity="info" sx={{mb: 2}}>ממתינים למיקום מהמכשיר כדי לשתף אותו עם העמותה...</Alert>
            )}
            {share.state === 'sharing' && (
                <Alert severity="success" sx={{mb: 2}}>המיקום שלך משותף בזמן אמת עם העמותה ועם מנהלי המערכת.</Alert>
            )}
            {share.state === 'error' && (
                <Alert severity="warning" sx={{mb: 2}}>{share.text}</Alert>
            )}

            {/* מפה אינטראקטיבית (מפתח דפדפן מוגבל מהשרת). בלי מפתח דפדפן - תמונת המפה מהשרת */}
            <LiveRouteMap
                route={route}
                current={route.status === 'InProgress' ? position : null}
                live={route.status === 'InProgress'}
                followLabel="עקוב אחריי"
                height={360}
                fallbackSrc={`/api/map/routes/${route.id}/image`}
            />

            <RouteSummary route={route} stopActions={stopActions} />
        </Box>
    );
}
