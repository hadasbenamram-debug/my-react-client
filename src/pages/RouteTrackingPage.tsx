import React, {useCallback, useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import FlagIcon from '@mui/icons-material/Flag';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import PageTitle from '../components/PageTitle';
import {EmptyState, LoadingBlock} from '../components/PageParts';
import RouteSummary from '../components/RouteSummary';
import LiveRouteMap, {TRAIL_COLOR} from '../components/LiveRouteMap';
import {MAP_COLORS} from '../components/GoogleMapView';
import {useRouteLive} from '../hooks/useRouteLive';
import type {LiveConnectionState} from '../hooks/useRouteLive';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {formatAgo, formatDateTime, formatTime, secondsSince} from '../utils/format';
import type {DeliveryLogResponseDto, RouteTrackingDto, TrackingPointDto} from '../types/api';
import type {LatLng} from '../types';

// מעקב חי אחרי משלוח (/app/track/:routeId) - לעמותה המקבלת, לספקים שבמסלול ולמנהל.
// הנתונים מגיעים מיומן המשלוח (DeliveryLogs) דרך api/tracking/routes/{id}, ואחר כך כל רישום חדש
// (המתנדב זז, איסוף, מסירה) מגיע בזמן אמת ב-SignalR. זמן ההגעה מתרענן כל דקה.

const REFRESH_MS = 60_000;

/** בלי עדכון מיקום יותר מזה - כנראה שאין למתנדב קליטה */
const STALE_SECONDS = 120;

const ROUTE_STATUS_LABELS: Record<string, string> = {
    Planned: 'טרם יצא לדרך',
    InProgress: 'בדרך',
    Completed: 'הסתיים',
    Cancelled: 'בוטל',
};

const ETA_SOURCE_TEXT: Record<string, string> = {
    live: 'לפי מצב התנועה עכשיו',
    estimate: 'הערכה לפי המרחק',
    plan: 'לפי התכנון',
};

const EVENT_ICONS: Record<string, ReactNode> = {
    Accepted: <CheckCircleOutlineOutlinedIcon fontSize="small" />,
    RouteStarted: <DirectionsCarIcon fontSize="small" />,
    PickedUp: <Inventory2Icon fontSize="small" />,
    Delivered: <FlagIcon fontSize="small" />,
    ReceiptConfirmed: <TaskAltIcon fontSize="small" />,
    Cancelled: <CancelOutlinedIcon fontSize="small" />,
};

const toLatLng = (p: TrackingPointDto): LatLng => ({lat: p.latitude, lng: p.longitude});

// ההתקדמות במסלול: יציאה לדרך -> איסוף בכל תחנה -> בדרך לעמותה -> נמסר
const progressOf = (tracking: RouteTrackingDto): {percent: number; label: string} => {
    const {route, totalStops, pickedUpStops} = tracking;
    if (route.status === 'Completed') return {percent: 100, label: 'המשלוח הסתיים - נמסר לעמותה'};
    if (route.status === 'Cancelled') return {percent: 0, label: 'המסלול בוטל'};
    if (!route.startedAt) {
        return {percent: 5, label: route.awaitingResponse ? 'ממתין לאישור המתנדב' : 'המתנדב אישר את המסלול וטרם יצא לדרך'};
    }
    if (totalStops > 0 && pickedUpStops >= totalStops) return {percent: 85, label: 'כל התרומות נאספו - בדרך לעמותה'};
    return {
        percent: 15 + Math.round((70 * pickedUpStops) / Math.max(1, totalStops)),
        label: `בדרך לאיסוף · נאספו ${pickedUpStops} מתוך ${totalStops} תחנות`,
    };
};

function LiveChip({live, connection}: {live: boolean; connection: LiveConnectionState}) {
    if (!live) return null;
    if (connection === 'live') {
        return (
            <Chip
                color="success"
                icon={<FiberManualRecordIcon sx={{fontSize: 14}} />}
                label="שידור חי"
                sx={{color: '#fff', '& .MuiChip-icon': {color: '#fff'}}}
            />
        );
    }
    if (connection === 'offline') {
        return <Chip color="warning" icon={<WifiOffIcon />} label="אין חיבור חי - מתעדכן כל דקה" />;
    }
    return <Chip variant="outlined" label={connection === 'reconnecting' ? 'מתחבר מחדש...' : 'מתחבר...'} />;
}

function LegendItem({color, label, line = false, dashed = false}: {color: string; label: string; line?: boolean; dashed?: boolean}) {
    return (
        <Stack direction="row" spacing={0.75} sx={{alignItems: 'center'}}>
            {line ? (
                <Box sx={{width: 22, borderTop: `4px ${dashed ? 'dashed' : 'solid'} ${color}`}} />
            ) : (
                <Box sx={{width: 12, height: 12, borderRadius: '50%', bgcolor: color}} />
            )}
            <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Stack>
    );
}

export function RouteTrackingPage() {
    const params = useParams();
    const navigate = useNavigate();
    const routeId = Number(params.routeId) || 0;

    const [tracking, setTracking] = useState<RouteTrackingDto | null>(null);
    const [trail, setTrail] = useState<TrackingPointDto[]>([]);
    const [events, setEvents] = useState<DeliveryLogResponseDto[]>([]);
    const [current, setCurrent] = useState<TrackingPointDto | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [notFound, setNotFound] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());
    const reloadTimer = useRef<number | null>(null);

    const load = useCallback(async () => {
        if (!routeId) {
            setNotFound(true);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/tracking/routes/${routeId}`, {headers: authHeaders()});
            if (res.status === 404) {
                setNotFound(true);
                return;
            }
            if (!res.ok) {
                setError(await readErrorMessage(res, 'לא ניתן לטעון את המעקב כרגע.'));
                return;
            }
            const data = (await res.json()) as RouteTrackingDto;
            setTracking(data);
            setTrail(data.trail);
            setEvents(data.events);
            setCurrent(data.currentPosition);
            setNotFound(false);
            setError(null);
        } catch {
            setError('לא ניתן לטעון את המעקב כרגע.');
        } finally {
            setLoading(false);
        }
    }, [routeId]);

    // כמה עדכונים ברצף (למשל "נאסף" + שינוי הסטטוס) - טעינה אחת
    const scheduleReload = useCallback(() => {
        if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(() => {
            reloadTimer.current = null;
            void load();
        }, 500);
    }, [load]);

    useEffect(() => {
        void load();
        return () => {
            if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
        };
    }, [load]);

    const live = tracking?.isLive === true;

    // עדכונים בזמן אמת מיומן המשלוח - רק אחרי שהמסלול נטען (כלומר מותר לצפות בו)
    const connection = useRouteLive(tracking ? routeId : null, {
        onLog: (log) => {
            if (log.type === 'Location') {
                if (log.latitude == null || log.longitude == null) return;
                const point: TrackingPointDto = {latitude: log.latitude, longitude: log.longitude, at: log.timestamp};
                setTrail((prev) => (prev.length > 0 && prev[prev.length - 1].at === point.at ? prev : [...prev, point]));
                setCurrent(point);
                return;
            }
            setEvents((prev) => (prev.some((e) => e.id === log.id) ? prev : [...prev, log]));
            scheduleReload();
        },
        onStatusChanged: scheduleReload,
        onJoined: scheduleReload,
    });

    // זמן ההגעה מתעדכן כל דקה כל עוד המתנדב בדרך
    useEffect(() => {
        if (!live) return undefined;
        const timer = window.setInterval(() => void load(), REFRESH_MS);
        return () => window.clearInterval(timer);
    }, [live, load]);

    // השעון של "עודכן לפני X שניות"
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 5000);
        return () => window.clearInterval(timer);
    }, []);

    if (loading) return <LoadingBlock text="טוען את המעקב..." />;

    if (!tracking) {
        return (
            <Box sx={{maxWidth: 800, mx: 'auto'}}>
                <PageTitle eyebrow="מעקב משלוח" title="מעקב חי" />
                <EmptyState text={notFound ? 'המסלול לא נמצא, או שאין לך הרשאה לצפות בו.' : error ?? 'לא ניתן לטעון את המעקב כרגע.'} />
                <Button startIcon={<ArrowForwardIcon />} sx={{mt: 2}} onClick={() => navigate(-1)}>חזרה</Button>
            </Box>
        );
    }

    const {route} = tracking;
    const progress = progressOf(tracking);
    const lastSeen = current?.at ?? null;
    const stale = live && lastSeen != null && secondsSince(lastSeen, now) > STALE_SECONDS;
    const completed = route.status === 'Completed';
    const etaText = ETA_SOURCE_TEXT[tracking.etaSource];

    return (
        <Box sx={{maxWidth: 1100, mx: 'auto'}}>
            <PageTitle
                eyebrow="מעקב משלוח"
                title={`מסלול #${route.id}`}
                subtitle={`אל ${route.ngoName ?? 'העמותה'} · ${route.stops.length} תחנות איסוף · מתנדב/ת: ${route.volunteerName ?? '—'}`}
            />

            {error && <Alert severity="warning" sx={{mb: 2}}>{error}</Alert>}

            <Card sx={{p: {xs: 2.5, md: 3}, mb: 2}}>
                <Stack direction={{xs: 'column', md: 'row'}} spacing={3} sx={{justifyContent: 'space-between'}}>
                    <Box sx={{flex: 1}}>
                        <Stack direction="row" sx={{flexWrap: 'wrap', gap: 1, mb: 1.5}}>
                            <LiveChip live={live} connection={connection} />
                            <Chip label={ROUTE_STATUS_LABELS[route.status] ?? route.status} />
                            {route.volunteerName && (
                                <Chip variant="outlined" icon={<LocalShippingIcon />} label={route.volunteerName} />
                            )}
                        </Stack>
                        <Typography sx={{fontWeight: 700, mb: 1}}>{progress.label}</Typography>
                        <LinearProgress variant="determinate" value={progress.percent} sx={{height: 10, borderRadius: 5}} />
                        {live && (
                            <Typography variant="body2" color={stale ? 'warning.main' : 'text.secondary'} sx={{mt: 1}}>
                                {lastSeen ? `המיקום עודכן ${formatAgo(lastSeen, now)}` : 'המתנדב עוד לא שיתף מיקום'}
                                {stale ? ' - ייתכן שאין למתנדב קליטה כרגע' : ''}
                            </Typography>
                        )}
                    </Box>

                    <Box sx={{minWidth: 220}}>
                        <Typography variant="body2" color="text.secondary">
                            {completed ? 'נמסר לעמותה' : 'הגעה משוערת לעמותה'}
                        </Typography>
                        <Typography variant="h4" sx={{fontWeight: 500}}>
                            {formatTime(completed ? route.completedAt : tracking.estimatedNgoArrival)}
                        </Typography>
                        {!completed && tracking.remainingMinutes != null && (
                            <Typography variant="body2">
                                בעוד כ-{Math.max(1, Math.round(tracking.remainingMinutes))} דק'
                                {tracking.remainingDistanceKm != null ? ` · ${tracking.remainingDistanceKm.toFixed(1)} ק"מ` : ''}
                            </Typography>
                        )}
                        {!completed && etaText && (
                            <Typography variant="caption" color="text.secondary">{etaText}</Typography>
                        )}
                    </Box>
                </Stack>
            </Card>

            <LiveRouteMap
                route={route}
                trail={trail.map(toLatLng)}
                current={current ? toLatLng(current) : null}
                live={live}
                remainingPolyline={tracking.remainingPolyline}
                fallbackSrc={`/api/map/routes/${route.id}/image`}
            />

            <Stack direction="row" sx={{flexWrap: 'wrap', gap: 2, mt: -1.5, mb: 3}}>
                <LegendItem color={MAP_COLORS.donor} label="תחנת איסוף" />
                <LegendItem color={MAP_COLORS.ngo} label="העמותה" />
                <LegendItem color={MAP_COLORS.volunteer} label="המתנדב" />
                <LegendItem color={TRAIL_COLOR} label="הדרך שנסע" line />
                <LegendItem color={MAP_COLORS.ngo} label="הדרך שנשארה" line dashed />
            </Stack>

            <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1.4fr'}, gap: 2, alignItems: 'start'}}>
                <Card sx={{p: {xs: 2.5, md: 3}}}>
                    <Typography variant="h6" sx={{mb: 1.5}}>מה קרה במסלול</Typography>
                    {events.length === 0 ? (
                        <Typography color="text.secondary">עוד אין עדכונים.</Typography>
                    ) : (
                        [...events].reverse().map((event, index) => (
                            <Stack
                                key={event.id}
                                direction="row"
                                spacing={1.5}
                                sx={{py: 1, borderBottom: index < events.length - 1 ? '1px solid' : 'none', borderColor: 'divider'}}
                            >
                                <Box sx={{color: index === 0 ? 'primary.dark' : 'text.secondary', mt: '2px'}}>
                                    {EVENT_ICONS[event.type] ?? <StickyNote2OutlinedIcon fontSize="small" />}
                                </Box>
                                <Box>
                                    <Typography sx={{fontWeight: index === 0 ? 700 : 500}}>{event.status}</Typography>
                                    <Typography variant="body2" color="text.secondary">{formatDateTime(event.timestamp)}</Typography>
                                </Box>
                            </Stack>
                        ))
                    )}
                </Card>

                <RouteSummary route={route} />
            </Box>
        </Box>
    );
}
