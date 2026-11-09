import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import PageTitle from '../components/PageTitle';
import {EmptyState, LoadingBlock} from '../components/PageParts';
import {InteractiveMap, MAP_COLORS} from '../components/GoogleMapView';
import type {MapLine, MapMarker} from '../components/GoogleMapView';
import {useAllRoutesLive} from '../hooks/useAllRoutesLive';
import type {LiveConnectionState} from '../hooks/useRouteLive';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {formatAgo, formatTime, MATCH_STATUS_LABELS, secondsSince} from '../utils/format';
import {hasLocation} from '../utils/googleMaps';
import type {RouteTrackingDto, TrackingPointDto} from '../types/api';
import type {LatLng} from '../types';

// המפה החיה של המנהל (/app/admin/live-map): כל המסלולים שמתנדבים נמצאים בהם עכשיו בדרך, על מפה אחת.
// הנתונים מ-api/tracking/live (אותו יומן משלוח שממנו בנוי המעקב של העמותה), ואחר כך כל רישום חדש
// של כל מסלול מגיע בזמן אמת ב-SignalR (WatchAllRoutes): המתנדבים זזים על המפה, ומסלול חדש שיצא לדרך מופיע לבד.

/** רענון מלא מהשרת גם בלי עדכונים (למשל אם החיבור החי נפל) */
const REFRESH_MS = 60_000;

/** בלי עדכון מיקום יותר מזה - כנראה שאין למתנדב קליטה */
const STALE_SECONDS = 120;

/** כל מסלול בצבע משלו (בלי הכתום של התורמים והטורקיז של העמותות) */
const ROUTE_COLORS = ['#d64545', '#3b6fd8', '#8e44ad', '#2e8b57', '#c2185b', '#6d4c41', '#5c6bc0', '#9e7c00'];

const PICKED_UP = ['InTransit', 'Completed'];

/** הצבע נקבע לפי מספר המסלול - כך הוא לא משתנה כשמסלולים אחרים מסתיימים או מתווספים */
const colorOf = (routeId: number): string => ROUTE_COLORS[routeId % ROUTE_COLORS.length];

const toLatLng = (p: TrackingPointDto): LatLng => ({lat: p.latitude, lng: p.longitude});

/** כל הנקודות של מסלול - כדי להתמקד בו על המפה */
const pointsOf = (t: RouteTrackingDto): LatLng[] => {
    const points: LatLng[] = t.route.stops
        .filter((s) => hasLocation(s.latitude, s.longitude))
        .map((s) => ({lat: s.latitude, lng: s.longitude}));
    if (hasLocation(t.route.ngoLatitude, t.route.ngoLongitude)) points.push({lat: t.route.ngoLatitude, lng: t.route.ngoLongitude});
    if (t.currentPosition) points.push(toLatLng(t.currentPosition));
    return points;
};

const progressOf = (t: RouteTrackingDto): {percent: number; label: string} => {
    if (t.totalStops > 0 && t.pickedUpStops >= t.totalStops) return {percent: 85, label: 'כל התרומות נאספו - בדרך לעמותה'};
    return {
        percent: 15 + Math.round((70 * t.pickedUpStops) / Math.max(1, t.totalStops)),
        label: `בדרך לאיסוף · נאספו ${t.pickedUpStops} מתוך ${t.totalStops}`,
    };
};

function LiveChip({connection}: {connection: LiveConnectionState}) {
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
    if (connection === 'offline') return <Chip color="warning" icon={<WifiOffIcon />} label="אין חיבור חי - מתעדכן כל דקה" />;
    return <Chip variant="outlined" label={connection === 'reconnecting' ? 'מתחבר מחדש...' : 'מתחבר...'} />;
}

export function AdminLiveRoutesMapPage() {
    const navigate = useNavigate();
    const [routes, setRoutes] = useState<RouteTrackingDto[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [ready, setReady] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [now, setNow] = useState<number>(() => Date.now());
    const reloadTimer = useRef<number | null>(null);
    const routesRef = useRef<RouteTrackingDto[]>([]);
    const mapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        routesRef.current = routes;
    });

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/tracking/live', {headers: authHeaders()});
            if (!res.ok) {
                setError(await readErrorMessage(res, 'לא ניתן לטעון את המסלולים כרגע.'));
                return;
            }
            const data = (await res.json()) as RouteTrackingDto[];
            setRoutes([...data].sort((a, b) => a.route.id - b.route.id));
            setError(null);
            setReady(true);
        } catch {
            setError('לא ניתן לטעון את המסלולים כרגע.');
        } finally {
            setLoading(false);
        }
    }, []);

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

    // עדכונים בזמן אמת מהיומן של כל המסלולים - רק אחרי שהטעינה הראשונה הצליחה (כלומר המשתמש מנהל)
    const connection = useAllRoutesLive(ready, {
        onLog: (log) => {
            if (log.type !== 'Location') {
                // יציאה לדרך / איסוף / מסירה / ביטול - טוענים מחדש (מסלול חדש מופיע, מסלול שהסתיים יורד)
                scheduleReload();
                return;
            }
            if (log.latitude == null || log.longitude == null) return;

            // מיקום של מסלול שעוד לא במפה - כנראה שהוא בדיוק יצא לדרך
            if (!routesRef.current.some((t) => t.route.id === log.volunteerRouteId)) {
                scheduleReload();
                return;
            }

            const point: TrackingPointDto = {latitude: log.latitude, longitude: log.longitude, at: log.timestamp};
            setRoutes((prev) =>
                prev.map((t) => {
                    if (t.route.id !== log.volunteerRouteId) return t;
                    const last = t.trail[t.trail.length - 1];
                    return {...t, trail: last && last.at === point.at ? t.trail : [...t.trail, point], currentPosition: point};
                }),
            );
        },
        onStatusChanged: scheduleReload,
        onJoined: scheduleReload,
    });

    useEffect(() => {
        if (!ready) return undefined;
        const timer = window.setInterval(() => void load(), REFRESH_MS);
        return () => window.clearInterval(timer);
    }, [ready, load]);

    // השעון של "עודכן לפני X שניות"
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 5000);
        return () => window.clearInterval(timer);
    }, []);

    if (loading) return <LoadingBlock text="טוען את המסלולים שבדרך..." />;

    // מסלול שנבחר והסתיים בינתיים - פשוט לא נמצא, וחוזרים לתצוגה של כולם
    const selected = routes.find((t) => t.route.id === selectedId) ?? null;
    const isStale = (t: RouteTrackingDto) => t.currentPosition != null && secondsSince(t.currentPosition.at, now) > STALE_SECONDS;

    const showOnMap = (routeId: number) => {
        setSelectedId(routeId);
        mapRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
    };

    // ───────── הסמנים והקווים של כל המסלולים ─────────
    const markers: MapMarker[] = [];
    const lines: MapLine[] = [];
    const ngos = new Map<number, {position: LatLng; name: string; address: string | null; count: number}>();

    routes.forEach((t) => {
        const {route} = t;
        const color = colorOf(route.id);
        const dimmed = selected != null && selected.route.id !== route.id;
        const stops = route.stops.filter((s) => hasLocation(s.latitude, s.longitude));

        stops.forEach((stop) => {
            markers.push({
                id: `r${route.id}-stop-${stop.matchId}`,
                position: {lat: stop.latitude, lng: stop.longitude},
                title: `מסלול #${route.id} · איסוף מ${stop.supplierName ?? 'ספק'}`,
                color,
                glyph: String(stop.order),
                muted: dimmed || PICKED_UP.includes(stop.status),
                info: (
                    <>
                        <Typography sx={{fontWeight: 700}}>מסלול #{route.id} · תחנה {stop.order}</Typography>
                        <Typography variant="body2">איסוף מ{stop.supplierName ?? 'ספק'}</Typography>
                        {stop.address && <Typography variant="body2">{stop.address}</Typography>}
                        <Typography variant="body2">{MATCH_STATUS_LABELS[stop.status] ?? stop.status}</Typography>
                    </>
                ),
            });
        });

        if (hasLocation(route.ngoLatitude, route.ngoLongitude)) {
            const ngo = ngos.get(route.ngoId);
            if (ngo) ngo.count += 1;
            else ngos.set(route.ngoId, {
                position: {lat: route.ngoLatitude, lng: route.ngoLongitude},
                name: route.ngoName ?? 'עמותה',
                address: route.ngoAddress,
                count: 1,
            });
        }

        if (t.currentPosition) {
            const stale = isStale(t);
            markers.push({
                id: `r${route.id}-volunteer`,
                position: toLatLng(t.currentPosition),
                title: `${route.volunteerName ?? 'מתנדב'} · מסלול #${route.id}`,
                variant: 'vehicle',
                color: dimmed ? '#9aa0a2' : color,
                pulse: !stale && !dimmed,
                zIndex: selected?.route.id === route.id ? 3000 : 2000,
                info: (
                    <>
                        <Typography sx={{fontWeight: 700}}>{route.volunteerName ?? 'מתנדב'} · מסלול #{route.id}</Typography>
                        <Typography variant="body2">אל {route.ngoName ?? 'העמותה'}</Typography>
                        <Typography variant="body2">{progressOf(t).label}</Typography>
                        <Typography variant="body2" color={stale ? 'warning.main' : 'text.secondary'}>
                            המיקום עודכן {formatAgo(t.currentPosition.at, now)}
                        </Typography>
                        <Button size="small" sx={{mt: 0.5, px: 0}} onClick={() => navigate(`/app/track/${route.id}`)}>
                            למעקב המלא
                        </Button>
                    </>
                ),
            });
        }

        // המסלול המתוכנן - רקע חלש בצבע של המסלול
        const planned: LatLng[] = [
            ...stops.map((s) => ({lat: s.latitude, lng: s.longitude})),
            ...(hasLocation(route.ngoLatitude, route.ngoLongitude) ? [{lat: route.ngoLatitude, lng: route.ngoLongitude}] : []),
        ];
        const plannedOpacity = dimmed ? 0.12 : 0.35;
        if (route.polyline) {
            lines.push({id: `r${route.id}-planned`, encodedPath: route.polyline, color, weight: 4, opacity: plannedOpacity, zIndex: 1});
        } else if (planned.length > 1) {
            lines.push({id: `r${route.id}-planned`, path: planned, color, weight: 3, opacity: plannedOpacity, dashed: true, zIndex: 1});
        }

        // הדרך שהמתנדב כבר נסע
        if (t.trail.length > 1) {
            lines.push({
                id: `r${route.id}-trail`,
                path: t.trail.map(toLatLng),
                color,
                weight: 5,
                opacity: dimmed ? 0.25 : 0.9,
                zIndex: selected?.route.id === route.id ? 5 : 3,
            });
        }
    });

    ngos.forEach((ngo, ngoId) => {
        markers.push({
            id: `ngo-${ngoId}`,
            position: ngo.position,
            title: ngo.name,
            color: MAP_COLORS.ngo,
            glyph: 'ע',
            zIndex: 500,
            info: (
                <>
                    <Typography sx={{fontWeight: 700}}>{ngo.name}</Typography>
                    {ngo.address && <Typography variant="body2">{ngo.address}</Typography>}
                    <Typography variant="body2">{ngo.count === 1 ? 'מסלול אחד בדרך אליה' : `${ngo.count} מסלולים בדרך אליה`}</Typography>
                </>
            ),
        });
    });

    return (
        <Box sx={{maxWidth: 1200, mx: 'auto'}}>
            <PageTitle
                eyebrow="ניהול מערכת"
                title="מפת מסלולים חיה"
                subtitle="כל המתנדבים שבדרך עכשיו, על מפה אחת. המיקום מתעדכן בזמן אמת, ומסלול חדש שיוצא לדרך מופיע לבד."
            />

            <Stack direction="row" sx={{flexWrap: 'wrap', gap: 1, mb: 2, alignItems: 'center'}}>
                {ready && <LiveChip connection={connection} />}
                <Chip label={routes.length === 1 ? 'מסלול אחד בדרך' : `${routes.length} מסלולים בדרך`} />
                {selected && (
                    <Chip
                        variant="outlined"
                        label={`מוצג: מסלול #${selected.route.id}`}
                        onDelete={() => setSelectedId(null)}
                        sx={{borderColor: colorOf(selected.route.id)}}
                    />
                )}
            </Stack>

            {error && <Alert severity="warning" sx={{mb: 2}}>{error}</Alert>}

            {routes.length === 0 ? (
                !error && <EmptyState text="אין כרגע מתנדבים בדרך. כשמתנדב ייצא לדרך, המסלול שלו יופיע כאן אוטומטית." />
            ) : (
                <>
                    <Box ref={mapRef}>
                        <InteractiveMap
                            markers={markers}
                            lines={lines}
                            height={560}
                            fitKey={`live-map|${selectedId ?? 'all'}`}
                            fitPositions={selected ? pointsOf(selected) : undefined}
                            onShowAll={() => setSelectedId(null)}
                            followTarget={selected?.currentPosition ? toLatLng(selected.currentPosition) : null}
                            followLabel="עקוב אחרי המתנדב"
                            fallback={
                                <Alert severity="info" sx={{mb: 3}}>
                                    המפה האינטראקטיבית לא זמינה כרגע (צריך מפתח דפדפן של Google Maps). הרשימה למטה מתעדכנת בזמן אמת,
                                    ואפשר לפתוח כל מסלול במעקב המלא.
                                </Alert>
                            }
                        />
                    </Box>

                    <Typography variant="body2" color="text.secondary" sx={{mt: -1.5, mb: 3}}>
                        כל מסלול בצבע משלו: קו מלא - הדרך שהמתנדב כבר נסע, קו חלש - המסלול המתוכנן, סיכות ממוספרות - תחנות האיסוף
                        (אפורה = נאספה), ע - העמותה.
                    </Typography>

                    <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', md: '1fr 1fr'}, gap: 2}}>
                        {routes.map((t) => {
                            const {route} = t;
                            const color = colorOf(route.id);
                            const progress = progressOf(t);
                            const stale = isStale(t);
                            const lastEvent = t.events.length > 0 ? t.events[t.events.length - 1] : null;
                            const isSelected = selected?.route.id === route.id;

                            return (
                                <Card
                                    key={route.id}
                                    sx={{p: 2.5, borderInlineStart: `6px solid ${color}`, outline: isSelected ? `2px solid ${color}` : 'none'}}
                                >
                                    <Stack direction="row" spacing={1} sx={{alignItems: 'center', mb: 1}}>
                                        <Box sx={{width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0}} />
                                        <Typography sx={{fontWeight: 700}}>
                                            מסלול #{route.id} · {route.volunteerName ?? 'מתנדב'}
                                        </Typography>
                                    </Stack>

                                    <Typography variant="body2" color="text.secondary">
                                        אל {route.ngoName ?? 'העמותה'} · {t.totalStops} תחנות איסוף
                                    </Typography>
                                    <Typography variant="body2" sx={{mt: 1, fontWeight: 500}}>{progress.label}</Typography>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress.percent}
                                        sx={{height: 8, borderRadius: 4, my: 1, '& .MuiLinearProgress-bar': {bgcolor: color}}}
                                    />

                                    <Typography variant="body2" color={stale ? 'warning.main' : 'text.secondary'}>
                                        {t.currentPosition
                                            ? `המיקום עודכן ${formatAgo(t.currentPosition.at, now)}${stale ? ' - ייתכן שאין קליטה' : ''}`
                                            : 'המתנדב עוד לא שיתף מיקום'}
                                    </Typography>
                                    {t.estimatedNgoArrival && (
                                        <Typography variant="body2" color="text.secondary">
                                            הגעה משוערת לעמותה (לפי התכנון): {formatTime(t.estimatedNgoArrival)}
                                        </Typography>
                                    )}
                                    {lastEvent && (
                                        <Typography variant="body2" color="text.secondary">
                                            עדכון אחרון: {lastEvent.status} ({formatTime(lastEvent.timestamp)})
                                        </Typography>
                                    )}

                                    <Stack direction="row" spacing={1} sx={{mt: 1.5, flexWrap: 'wrap', gap: 1}}>
                                        <Button
                                            size="small"
                                            variant={isSelected ? 'contained' : 'outlined'}
                                            startIcon={<CenterFocusStrongIcon />}
                                            onClick={() => showOnMap(route.id)}
                                        >
                                            הצג במפה
                                        </Button>
                                        <Button size="small" variant="text" startIcon={<MyLocationIcon />} onClick={() => navigate(`/app/track/${route.id}`)}>
                                            מעקב מלא
                                        </Button>
                                    </Stack>
                                </Card>
                            );
                        })}
                    </Box>
                </>
            )}
        </Box>
    );
}
