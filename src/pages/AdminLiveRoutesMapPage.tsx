import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import PageTitle from '../components/PageTitle';
import {EmptyState, LoadingBlock} from '../components/PageParts';
import {InteractiveMap, MAP_COLORS} from '../components/GoogleMapView';
import type {MapLine, MapMarker} from '../components/GoogleMapView';
import ControlRoomSchematic, {type SchematicRoute} from '../components/ControlRoomSchematic';
import {useAllRoutesLive} from '../hooks/useAllRoutesLive';
import {useAnimatedPositions, type AnimatedTarget} from '../hooks/useAnimatedPositions';
import type {LiveConnectionState} from '../hooks/useRouteLive';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {formatAgo, formatTime, secondsSince} from '../utils/format';
import {hasLocation} from '../utils/googleMaps';
import {decodePolyline, headingDeg, pathKm} from '../utils/liveEta';
import type {DeliveryLogResponseDto, MatchView, RouteStopDto, RouteTrackingDto, TrackingPointDto} from '../types/api';
import type {LatLng} from '../types';
import '../styles/control-room.css';

// חדר הבקרה החי של המנהל (/app/admin/live-map) - תיקון 61 (שדרוג של "מפת מסלולים חיה"):
//  - כל המסלולים הפעילים על מפה אחת. הרכבים "נוסעים" (מחליקים בין עדכוני המיקום) עם חץ לכיוון הנסיעה.
//  - תחנות האיסוף עגולות, ונצבעות בצבע המסלול (עם ✓) ברגע שהמתנדב אוסף אותן. התחנה הבאה מהבהבת.
//  - זמן הגעה משוער לעמותה שמתעדכן עם כל מיקום חדש: מתחילים מההערכה של השרת (Google לפי התנועה, אם יש),
//    ומעדכנים אותה לפי כמה מהדרך נשארה מהמיקום הנוכחי. ליד: פער מהתכנון המקורי.
//  - מדדים בראש העמוד, רשימת מסלולים בצד, ויומן אירועים חי.
// הנתונים: api/tracking/live, ועדכונים בזמן אמת ב-SignalR (WatchAllRoutes). בלי מפת Google - מפה סכמטית.
// תיקון 63: גם השיבוצים שעוד לא יצאו לדרך (ממתינים לאישור המתנדב / אושרו) - ברשימה "ממתינים ליציאה",
// מתוך api/matches/active. כך הדף "ניהול מסלולים" כבר לא נחוץ ונמחק.

/** רענון מלא מהשרת גם בלי עדכונים (למשל אם החיבור החי נפל) - וגם ההערכה של Google מתרעננת */
const REFRESH_MS = 60_000;

/** בלי עדכון מיקום יותר מזה - כנראה שאין למתנדב קליטה */
const STALE_SECONDS = 120;

/** כל מסלול בצבע משלו (בלי הכתום של התורמים והטורקיז של העמותות) */
const ROUTE_COLORS = ['#d64545', '#3b6fd8', '#8e44ad', '#2e8b57', '#c2185b', '#6d4c41', '#5c6bc0', '#9e7c00'];

const PICKED_UP = ['InTransit', 'Completed'];

/** כשאין הערכה מהשרת: מהירות ממוצעת בעיר, מקדם לדרך (לעומת קו אווירי) ודקות בכל תחנה */
const CITY_KMH = 28;
const ROAD_FACTOR = 1.3;
const STOP_MINUTES = 4;

const FEED_SIZE = 14;

const colorOf = (routeId: number): string => ROUTE_COLORS[routeId % ROUTE_COLORS.length];
const toLatLng = (p: TrackingPointDto): LatLng => ({lat: p.latitude, lng: p.longitude});
const isPicked = (s: RouteStopDto) => PICKED_UP.includes(s.status) || s.pickedUpAt != null;

const stopsWithLocation = (t: RouteTrackingDto) =>
    [...t.route.stops].filter((s) => hasLocation(s.latitude, s.longitude)).sort((a, b) => a.order - b.order);
const pendingStops = (t: RouteTrackingDto) => stopsWithLocation(t).filter((s) => !isPicked(s));
const ngoOf = (t: RouteTrackingDto): LatLng | null =>
    hasLocation(t.route.ngoLatitude, t.route.ngoLongitude) ? {lat: t.route.ngoLatitude, lng: t.route.ngoLongitude} : null;

/** הדרך שנשארה: מהמיקום, דרך התחנות שעוד לא נאספו, אל העמותה */
const remainingWay = (t: RouteTrackingDto, from: LatLng): LatLng[] => {
    const ngo = ngoOf(t);
    return [from, ...pendingStops(t).map((s) => ({lat: s.latitude, lng: s.longitude})), ...(ngo ? [ngo] : [])];
};

const pointsOf = (t: RouteTrackingDto, vehicle: LatLng | null): LatLng[] => {
    const points: LatLng[] = stopsWithLocation(t).map((s) => ({lat: s.latitude, lng: s.longitude}));
    const ngo = ngoOf(t);
    if (ngo) points.push(ngo);
    if (vehicle) points.push(vehicle);
    return points;
};

/** בסיס להערכת זמן ההגעה - מה שהשרת חישב, ובאיזה מרחק (אווירי) זה היה */
interface EtaBaseline {
    minutes: number | null;
    km: number;
}

interface FeedItem {
    id: number;
    at: string;
    routeId: number;
    color: string;
    text: string;
}

const describeLog = (log: DeliveryLogResponseDto, t: RouteTrackingDto | undefined): string | null => {
    const who = t?.route.volunteerName ?? 'מתנדב';
    const stop = t?.route.stops.find((s) => s.matchId === log.matchId);
    switch (log.type) {
        case 'Accepted': return `${who} – אישור המסלול`;
        case 'RouteStarted': return `${who} – יציאה לדרך`;
        case 'PickedUp': return `${who} – איסוף מ${stop?.supplierName ?? 'הספק'}`;
        case 'Delivered': return `${who} – מסירה ל${t?.route.ngoName ?? 'עמותה'}`;
        case 'ReceiptConfirmed': return `${t?.route.ngoName ?? 'העמותה'} – אישור קבלה`;
        case 'Cancelled': return `מסלול #${log.volunteerRouteId} – ביטול${stop?.supplierName ? ` (${stop.supplierName})` : ''}`;
        case 'Note': return log.notes ? `${who}: ${log.notes}` : null;
        default: return null;
    }
};

const inMinutes = (minutes: number): string => {
    if (minutes < 1) return 'פחות מדקה';
    const m = Math.round(minutes);
    if (m < 60) return `בעוד ${m} דק׳`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return `בעוד ${h === 1 ? 'שעה' : `${h} שעות`}${rest ? ` ו-${rest} דק׳` : ''}`;
};

const clockOf = (ms: number) => new Date(ms).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit'});

// ───────── תיקון 63: ממתינים ליציאה ─────────
/** מסלול (או שיבוץ בודד) שעוד לא יצא לדרך - כמה תחנות של אותו מתנדב מוצגות ככרטיס אחד */
interface WaitingGroup {
    key: string;
    routeId: number | null;
    volunteerName: string | null;
    /** לפחות תחנה אחת עוד מחכה שהמתנדב יאשר */
    awaiting: boolean;
    deadline: string | null;
    firstPickup: string | null;
    suppliers: string[];
    ngoName: string | null;
    donationIds: number[];
}

const groupWaiting = (matches: MatchView[]): WaitingGroup[] => {
    const groups = new Map<string, WaitingGroup>();
    matches.forEach((m) => {
        const key = m.volunteerRouteId != null ? `r${m.volunteerRouteId}` : `m${m.id}`;
        const g: WaitingGroup = groups.get(key) ?? {
            key, routeId: m.volunteerRouteId, volunteerName: m.volunteerName, awaiting: false,
            deadline: null, firstPickup: null, suppliers: [], ngoName: m.ngoName, donationIds: [],
        };
        if (m.statusName === 'AwaitingVolunteerConfirmation') {
            g.awaiting = true;
            if (m.responseDeadline && (!g.deadline || Date.parse(m.responseDeadline) < Date.parse(g.deadline))) g.deadline = m.responseDeadline;
        }
        if (m.estimatedArrival && (!g.firstPickup || Date.parse(m.estimatedArrival) < Date.parse(g.firstPickup))) g.firstPickup = m.estimatedArrival;
        if (m.supplierName && !g.suppliers.includes(m.supplierName)) g.suppliers.push(m.supplierName);
        if (!g.donationIds.includes(m.donationId)) g.donationIds.push(m.donationId);
        groups.set(key, g);
    });
    // קודם מה שמחכה לאישור, ואחר כך לפי שעת האיסוף הראשונה
    return [...groups.values()].sort((a, b) =>
        Number(b.awaiting) - Number(a.awaiting)
        || (a.firstPickup ? Date.parse(a.firstPickup) : Infinity) - (b.firstPickup ? Date.parse(b.firstPickup) : Infinity));
};

function WaitingRoutes({groups, standalone = false, onTrack}: {
    groups: WaitingGroup[];
    standalone?: boolean;
    onTrack: (routeId: number) => void;
}) {
    if (groups.length === 0) return null;
    return (
        <section className={`cr-waiting ${standalone ? 'is-standalone' : ''}`} aria-label="ממתינים ליציאה">
            <h2>ממתינים ליציאה <span className="cr-waiting-count">{groups.length}</span></h2>
            <p className="cr-waiting-sub">שיבוצים שעוד לא יצאו לדרך. ברגע שהמתנדב ייצא - המסלול יופיע על המפה.</p>
            <div className="cr-waiting-list">
                {groups.map((g) => (
                    <article key={g.key} className={`cr-wait ${g.awaiting ? 'is-awaiting' : ''}`}>
                        <header className="cr-route-head">
                            <strong>{g.routeId != null ? `#${g.routeId} · ` : ''}{g.volunteerName ?? 'מתנדב'}</strong>
                            <span className="cr-route-phase">{g.awaiting ? 'ממתין לאישור' : 'אושר · טרם יצא'}</span>
                        </header>
                        <p className="cr-wait-way">{g.suppliers.length > 0 ? g.suppliers.join(' · ') : 'ספק'} ← {g.ngoName ?? 'עמותה'}</p>
                        <p className="cr-next">
                            {g.awaiting && g.deadline && <>תשובה עד <strong dir="ltr">{formatTime(g.deadline)}</strong> · </>}
                            {g.firstPickup
                                ? <>איסוף ראשון בערך ב-<strong dir="ltr">{formatTime(g.firstPickup)}</strong></>
                                : 'עוד אין שעת איסוף משוערת'}
                        </p>
                        <p className="cr-ago">
                            {g.donationIds.length === 1 ? `תרומה #${g.donationIds[0]}` : `${g.donationIds.length} תרומות: ${g.donationIds.map((d) => `#${d}`).join(', ')}`}
                        </p>
                        {g.routeId != null && !g.awaiting && (
                            <div className="cr-route-actions">
                                <Button size="small" variant="text" startIcon={<MyLocationIcon />} onClick={() => onTrack(g.routeId as number)}>
                                    מעקב מלא
                                </Button>
                            </div>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
}

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
    const [baselines, setBaselines] = useState<Record<number, EtaBaseline>>({});
    const [feed, setFeed] = useState<FeedItem[]>([]);
    const [waiting, setWaiting] = useState<MatchView[]>([]);
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

    const addToFeed = useCallback((items: FeedItem[]) => {
        if (items.length === 0) return;
        setFeed((prev) => {
            const byId = new Map(prev.map((f) => [f.id, f]));
            items.forEach((f) => byId.set(f.id, f));
            return [...byId.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, FEED_SIZE);
        });
    }, []);

    // תיקון 63: השיבוצים הפעילים שהמסלול שלהם עוד לא במפה (לא יצאו לדרך). זה חלק משני - כישלון לא מציג שגיאה.
    const loadWaiting = useCallback(async (liveRouteIds: Set<number>) => {
        try {
            const res = await fetch('/api/matches/active', {headers: authHeaders()});
            if (!res.ok) return;
            const all = (await res.json()) as MatchView[];
            setWaiting(all.filter((m) => m.volunteerRouteId == null || !liveRouteIds.has(m.volunteerRouteId)));
        } catch {
            // נשארת הרשימה הקודמת
        }
    }, []);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/tracking/live', {headers: authHeaders()});
            if (!res.ok) {
                setError(await readErrorMessage(res, 'לא ניתן לטעון את המסלולים כרגע.'));
                return;
            }
            const data = [...((await res.json()) as RouteTrackingDto[])].sort((a, b) => a.route.id - b.route.id);
            setRoutes(data);
            void loadWaiting(new Set(data.map((t) => t.route.id)));

            // ההערכה של השרת - והמרחק שנשאר באותו רגע, כדי לעדכן אותה כשהרכב מתקדם
            const base: Record<number, EtaBaseline> = {};
            data.forEach((t) => {
                const from = t.currentPosition ? toLatLng(t.currentPosition) : pendingStops(t)[0]
                    ? {lat: pendingStops(t)[0].latitude, lng: pendingStops(t)[0].longitude}
                    : ngoOf(t);
                base[t.route.id] = {minutes: t.remainingMinutes, km: from ? pathKm(remainingWay(t, from)) : 0};
            });
            setBaselines(base);

            addToFeed(data.flatMap((t) => t.events
                .map((e) => ({e, text: describeLog(e, t)}))
                .filter((x): x is {e: DeliveryLogResponseDto; text: string} => x.text != null)
                .map(({e, text}) => ({id: e.id, at: e.timestamp, routeId: t.route.id, color: colorOf(t.route.id), text}))));
            setError(null);
            setReady(true);
        } catch {
            setError('לא ניתן לטעון את המסלולים כרגע.');
        } finally {
            setLoading(false);
        }
    }, [addToFeed, loadWaiting]);

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
                // יציאה לדרך / איסוף / מסירה / ביטול - מיד ביומן, וטעינה מחדש (התחנה נצבעת, מסלול חדש מופיע)
                const route = routesRef.current.find((t) => t.route.id === log.volunteerRouteId);
                const text = describeLog(log, route);
                if (text) addToFeed([{id: log.id, at: log.timestamp, routeId: log.volunteerRouteId, color: colorOf(log.volunteerRouteId), text}]);
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

    // השעון של חדר הבקרה, "עודכן לפני X" והספירה לאחור של זמני ההגעה
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, []);

    // ───────── הרכבים: מחליקים למיקום החדש ─────────
    const targets = useMemo(() => {
        const result: Record<string, AnimatedTarget> = {};
        routes.forEach((t) => {
            if (t.currentPosition) result[String(t.route.id)] = {position: toLatLng(t.currentPosition), at: t.currentPosition.at};
        });
        return result;
    }, [routes]);
    const animated = useAnimatedPositions(targets);

    if (loading) return <LoadingBlock text="טוען את המסלולים שבדרך..." />;

    // מסלול שנבחר והסתיים בינתיים - פשוט לא נמצא, וחוזרים לתצוגה של כולם
    const selected = routes.find((t) => t.route.id === selectedId) ?? null;
    const isStale = (t: RouteTrackingDto) => t.currentPosition != null && secondsSince(t.currentPosition.at, now) > STALE_SECONDS;
    const vehicleOf = (t: RouteTrackingDto): LatLng | null =>
        animated[String(t.route.id)] ?? (t.currentPosition ? toLatLng(t.currentPosition) : null);
    const headingOf = (t: RouteTrackingDto): number | null => {
        const n = t.trail.length;
        return n >= 2 ? headingDeg(toLatLng(t.trail[n - 2]), toLatLng(t.trail[n - 1])) : null;
    };

    // ───────── זמן הגעה משוער שמתעדכן ─────────
    const etaOf = (t: RouteTrackingDto) => {
        const pending = pendingStops(t);
        const from = vehicleOf(t);
        const ngo = ngoOf(t);
        if (!from || !ngo) {
            const fallback = t.estimatedNgoArrival ?? t.route.estimatedNgoArrival;
            return fallback ? {at: Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(fallback) ? fallback : `${fallback}Z`), minutes: null, next: null, nextMinutes: null, live: false} : null;
        }
        const way = remainingWay(t, from);
        const km = pathKm(way);
        const base = baselines[t.route.id];
        let minutes: number;
        let live: boolean;
        if (base?.minutes != null && base.km > 0.3) {
            minutes = base.minutes * (km / base.km);
            live = true;
        } else {
            minutes = ((km * ROAD_FACTOR) / CITY_KMH) * 60 + STOP_MINUTES * pending.length;
            live = false;
        }
        const next = pending[0] ?? null;
        const kmToNext = next ? pathKm([from, {lat: next.latitude, lng: next.longitude}]) : 0;
        const nextMinutes = next && km > 0 ? Math.max(0, minutes * (kmToNext / km)) : null;
        return {at: now + minutes * 60_000, minutes, next, nextMinutes, live};
    };

    const plannedOf = (t: RouteTrackingDto): number | null => {
        const p = t.route.estimatedNgoArrival;
        return p ? Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(p) ? p : `${p}Z`) : null;
    };

    const etas = new Map(routes.map((t) => [t.route.id, etaOf(t)]));

    // ───────── המדדים בראש העמוד ─────────
    const totalStops = routes.reduce((n, t) => n + t.totalStops, 0);
    const pickedStops = routes.reduce((n, t) => n + t.pickedUpStops, 0);
    const staleCount = routes.filter(isStale).length;
    const waitingGroups = groupWaiting(waiting);
    const openTracking = (routeId: number) => navigate(`/app/track/${routeId}`);
    const soonest = routes
        .map((t) => ({t, eta: etas.get(t.route.id)}))
        .filter((x) => x.eta != null)
        .sort((a, b) => a.eta!.at - b.eta!.at)[0];

    const showOnMap = (routeId: number) => {
        setSelectedId(routeId);
        mapRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'});
    };

    // ───────── הסמנים והקווים של מפת Google ─────────
    const markers: MapMarker[] = [];
    const lines: MapLine[] = [];
    const ngos = new Map<number, {position: LatLng; name: string; address: string | null; count: number}>();
    const schematic: SchematicRoute[] = [];

    routes.forEach((t) => {
        const {route} = t;
        const color = colorOf(route.id);
        const dimmed = selected != null && selected.route.id !== route.id;
        const stops = stopsWithLocation(t);
        const nextStop = pendingStops(t)[0];
        const vehicle = vehicleOf(t);
        const heading = headingOf(t);
        const ngo = ngoOf(t);

        stops.forEach((stop) => {
            const done = isPicked(stop);
            markers.push({
                id: `r${route.id}-stop-${stop.matchId}`,
                position: {lat: stop.latitude, lng: stop.longitude},
                title: `מסלול #${route.id} · ${done ? 'נאסף' : 'איסוף'} מ${stop.supplierName ?? 'ספק'}`,
                variant: 'stop',
                color,
                glyph: String(stop.order),
                done,
                next: nextStop?.matchId === stop.matchId,
                muted: dimmed,
                info: (
                    <>
                        <Typography sx={{fontWeight: 700}}>מסלול #{route.id} · תחנה {stop.order}</Typography>
                        <Typography variant="body2">{done ? 'נאסף' : 'איסוף'} מ{stop.supplierName ?? 'ספק'}</Typography>
                        {stop.address && <Typography variant="body2">{stop.address}</Typography>}
                        {done && stop.pickedUpAt && <Typography variant="body2">נאסף ב-{formatTime(stop.pickedUpAt)}</Typography>}
                    </>
                ),
            });
        });

        if (ngo) {
            const known = ngos.get(route.ngoId);
            if (known) known.count += 1;
            else ngos.set(route.ngoId, {position: ngo, name: route.ngoName ?? 'עמותה', address: route.ngoAddress, count: 1});
        }

        if (vehicle) {
            const stale = isStale(t);
            const eta = etas.get(route.id);
            markers.push({
                id: `r${route.id}-volunteer`,
                position: vehicle,
                title: `${route.volunteerName ?? 'מתנדב'} · מסלול #${route.id}`,
                variant: 'vehicle',
                color: dimmed ? '#9aa0a2' : color,
                heading: dimmed ? null : heading,
                pulse: !stale && !dimmed,
                zIndex: selected?.route.id === route.id ? 3000 : 2000,
                info: (
                    <>
                        <Typography sx={{fontWeight: 700}}>{route.volunteerName ?? 'מתנדב'} · מסלול #{route.id}</Typography>
                        <Typography variant="body2">אל {route.ngoName ?? 'העמותה'} · נאספו {t.pickedUpStops} מתוך {t.totalStops}</Typography>
                        {eta && <Typography variant="body2">הגעה משוערת: {clockOf(eta.at)}</Typography>}
                        <Typography variant="body2" color={stale ? 'warning.main' : 'text.secondary'}>
                            המיקום עודכן {formatAgo(t.currentPosition?.at ?? null, now)}
                        </Typography>
                        <Button size="small" sx={{mt: 0.5, px: 0}} onClick={() => navigate(`/app/track/${route.id}`)}>
                            למעקב המלא
                        </Button>
                    </>
                ),
            });
        }

        // המסלול המתוכנן - רקע חלש בצבע של המסלול
        const plannedPoints: LatLng[] = route.polyline
            ? decodePolyline(route.polyline)
            : [...stops.map((s) => ({lat: s.latitude, lng: s.longitude})), ...(ngo ? [ngo] : [])];
        const plannedOpacity = dimmed ? 0.12 : 0.35;
        if (route.polyline) {
            lines.push({id: `r${route.id}-planned`, encodedPath: route.polyline, color, weight: 4, opacity: plannedOpacity, zIndex: 1});
        } else if (plannedPoints.length > 1) {
            lines.push({id: `r${route.id}-planned`, path: plannedPoints, color, weight: 3, opacity: plannedOpacity, dashed: true, zIndex: 1});
        }

        // הדרך שהמתנדב כבר נסע - עד המיקום (המונפש) של הרכב
        const trail = [...t.trail.map(toLatLng), ...(vehicle ? [vehicle] : [])];
        if (trail.length > 1) {
            lines.push({
                id: `r${route.id}-trail`,
                path: trail,
                color,
                weight: 5,
                opacity: dimmed ? 0.25 : 0.9,
                zIndex: selected?.route.id === route.id ? 5 : 3,
            });
        }

        schematic.push({
            id: route.id,
            color,
            planned: plannedPoints,
            trail,
            stops: stops.map((s) => ({
                id: `${route.id}-${s.matchId}`,
                position: {lat: s.latitude, lng: s.longitude},
                label: String(s.order),
                done: isPicked(s),
                next: nextStop?.matchId === s.matchId,
            })),
            ngo: ngo ? {position: ngo, name: route.ngoName ?? 'עמותה'} : null,
            vehicle: vehicle ? {position: vehicle, heading, name: route.volunteerName ?? 'מתנדב', stale: isStale(t)} : null,
        });
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
        <Box sx={{maxWidth: 1400, mx: 'auto'}}>
            <PageTitle
                eyebrow="ניהול מערכת"
                title="חדר בקרה חי"
                subtitle="כל המסלולים הפעילים על מפה אחת: הרכבים נוסעים בזמן אמת, התחנות נצבעות כשאוספים אותן, וזמני ההגעה מתעדכנים עם כל מיקום חדש."
            />

            {/* ── שורת המצב והמדדים ── */}
            <div className="cr-status">
                <div className="cr-status-live">
                    {ready && <LiveChip connection={connection} />}
                    <span className="cr-clock" dir="ltr">{new Date(now).toLocaleTimeString('he-IL', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}</span>
                </div>
                <div className="cr-kpis">
                    <div className="cr-kpi">
                        <span className="cr-kpi-value">{routes.length}</span>
                        <span className="cr-kpi-label">{routes.length === 1 ? 'מסלול פעיל' : 'מסלולים פעילים'}</span>
                        {waitingGroups.length > 0 && <span className="cr-kpi-note">ועוד {waitingGroups.length} ממתינים ליציאה</span>}
                    </div>
                    <div className="cr-kpi">
                        <span className="cr-kpi-value">{pickedStops}<small>/{totalStops}</small></span>
                        <span className="cr-kpi-label">תחנות נאספו</span>
                        <span className="cr-kpi-bar"><span style={{width: `${totalStops ? (100 * pickedStops) / totalStops : 0}%`}} /></span>
                    </div>
                    <div className="cr-kpi">
                        <span className="cr-kpi-value">{soonest?.eta ? clockOf(soonest.eta.at) : '—'}</span>
                        <span className="cr-kpi-label">{soonest ? `ההגעה הקרובה · ${soonest.t.route.ngoName ?? 'עמותה'}` : 'ההגעה הקרובה'}</span>
                    </div>
                    <div className={`cr-kpi ${staleCount > 0 ? 'is-warning' : ''}`}>
                        <span className="cr-kpi-value">{staleCount}</span>
                        <span className="cr-kpi-label">בלי קליטה (מעל 2 דק׳)</span>
                    </div>
                </div>
            </div>

            {error && <Alert severity="warning" sx={{mb: 2}}>{error}</Alert>}

            {routes.length === 0 ? (
                <>
                    {!error && <EmptyState text="אין כרגע מתנדבים בדרך. כשמתנדב ייצא לדרך, המסלול שלו יופיע כאן אוטומטית." />}
                    <WaitingRoutes groups={waitingGroups} standalone onTrack={openTracking} />
                </>
            ) : (
                <div className="cr-layout">
                    {/* ── המפה ── */}
                    <div className="cr-map" ref={mapRef}>
                        {selected && (
                            <Chip
                                className="cr-map-chip"
                                variant="outlined"
                                label={`מוצג: מסלול #${selected.route.id} · ${selected.route.volunteerName ?? 'מתנדב'}`}
                                onDelete={() => setSelectedId(null)}
                                sx={{borderColor: colorOf(selected.route.id), bgcolor: '#fff'}}
                            />
                        )}
                        <InteractiveMap
                            markers={markers}
                            lines={lines}
                            height={640}
                            fitKey={`live-map|${selectedId ?? 'all'}`}
                            fitPositions={selected ? pointsOf(selected, vehicleOf(selected)) : undefined}
                            onShowAll={() => setSelectedId(null)}
                            followTarget={selected ? vehicleOf(selected) : null}
                            followLabel="עקוב אחרי המתנדב"
                            fallback={
                                <div className="cr-schematic-wrap">
                                    <ControlRoomSchematic routes={schematic} selectedId={selectedId} onSelect={setSelectedId} />
                                </div>
                            }
                        />
                        <p className="cr-legend">
                            <span><i className="cr-legend-stop" /> תחנה שעוד לא נאספה</span>
                            <span><i className="cr-legend-stop is-done" /> נאספה</span>
                            <span><i className="cr-legend-line" /> הדרך שכבר נסעו</span>
                            <span><i className="cr-legend-line is-planned" /> המסלול המתוכנן</span>
                            <span><i className="cr-legend-ngo">ע</i> עמותה</span>
                        </p>
                    </div>

                    {/* ── רשימת המסלולים ── */}
                    <aside className="cr-panel" aria-label="המסלולים הפעילים">
                        {routes.map((t) => {
                            const {route} = t;
                            const color = colorOf(route.id);
                            const eta = etas.get(route.id);
                            const planned = plannedOf(t);
                            const delay = eta && planned ? Math.round((eta.at - planned) / 60_000) : null;
                            const stale = isStale(t);
                            const allPicked = t.totalStops > 0 && t.pickedUpStops >= t.totalStops;
                            const isSelected = selected?.route.id === route.id;
                            return (
                                <article key={route.id} className={`cr-route ${isSelected ? 'is-selected' : ''}`}
                                    style={{['--route' as string]: color}} onClick={() => setSelectedId(route.id)}>
                                    <header className="cr-route-head">
                                        <span className="cr-route-dot" />
                                        <strong>#{route.id} · {route.volunteerName ?? 'מתנדב'}</strong>
                                        <span className="cr-route-phase">{allPicked ? 'בדרך לעמותה' : 'בדרך לאיסוף'}</span>
                                    </header>

                                    {/* התחנות - נצבעות כשנאספות */}
                                    <ol className="cr-stops" aria-label="תחנות המסלול">
                                        {stopsWithLocation(t).map((s) => {
                                            const done = isPicked(s);
                                            const next = eta?.next?.matchId === s.matchId;
                                            return (
                                                <li key={s.matchId} className={`${done ? 'is-done' : ''} ${next ? 'is-next' : ''}`}
                                                    title={`${s.supplierName ?? 'ספק'}${done && s.pickedUpAt ? ` · נאסף ${formatTime(s.pickedUpAt)}` : ''}`}>
                                                    <span>{done ? '✓' : s.order}</span>
                                                </li>
                                            );
                                        })}
                                        <li className="cr-stops-ngo" title={route.ngoName ?? 'עמותה'}><span>ע</span></li>
                                    </ol>

                                    <div className="cr-eta">
                                        <div>
                                            <span className="cr-eta-label">הגעה לעמותה{eta?.live ? '' : ' (הערכה)'}</span>
                                            <span className="cr-eta-time" dir="ltr">{eta ? clockOf(eta.at) : '—'}</span>
                                        </div>
                                        <div className="cr-eta-side">
                                            {eta?.minutes != null && <span className="cr-eta-in">{inMinutes(eta.minutes)}</span>}
                                            {delay != null && Math.abs(delay) >= 5 && (
                                                <span className={`cr-delay ${delay > 0 ? 'is-late' : 'is-early'}`}>
                                                    {delay > 0 ? `+${delay} דק׳ מהתכנון` : `${-delay} דק׳ לפני התכנון`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {eta?.next && (
                                        <p className="cr-next">
                                            התחנה הבאה: <strong>{eta.next.supplierName ?? 'ספק'}</strong>
                                            {eta.nextMinutes != null && ` · ${inMinutes(eta.nextMinutes)}`}
                                        </p>
                                    )}
                                    <p className={`cr-ago ${stale ? 'is-stale' : ''}`}>
                                        {t.currentPosition
                                            ? `המיקום עודכן ${formatAgo(t.currentPosition.at, now)}${stale ? ' - ייתכן שאין קליטה' : ''}`
                                            : 'המתנדב עוד לא שיתף מיקום'}
                                    </p>

                                    <div className="cr-route-actions">
                                        <Button size="small" variant={isSelected ? 'contained' : 'outlined'} startIcon={<CenterFocusStrongIcon />}
                                            onClick={(e) => { e.stopPropagation(); showOnMap(route.id); }}>
                                            הצג במפה
                                        </Button>
                                        <Button size="small" variant="text" startIcon={<MyLocationIcon />}
                                            onClick={(e) => { e.stopPropagation(); openTracking(route.id); }}>
                                            מעקב מלא
                                        </Button>
                                    </div>
                                </article>
                            );
                        })}
                    </aside>

                    <div className="cr-below">
                        {/* תיקון 63: מה שעוד לא יצא לדרך - מתחת למפה, כדי שיראו בלי לגלול ברשימה */}
                        <WaitingRoutes groups={waitingGroups} onTrack={openTracking} />

                        {/* ── יומן אירועים חי ── */}
                        <section className="cr-feed" aria-label="יומן אירועים">
                            <h2>יומן אירועים חי</h2>
                            {feed.length === 0 ? (
                                <p className="cr-feed-empty">עוד אין אירועים. יציאה לדרך, איסוף ומסירה יופיעו כאן ברגע שהם קורים.</p>
                            ) : (
                                <ul>
                                    {feed.map((f) => (
                                        <li key={f.id} style={{['--route' as string]: f.color}}>
                                            <span className="cr-feed-time" dir="ltr">{formatTime(f.at)}</span>
                                            <span className="cr-feed-dot" />
                                            <span className="cr-feed-text">{f.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                </div>
            )}
        </Box>
    );
}
