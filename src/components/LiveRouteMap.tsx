import React, {useEffect, useMemo, useRef, useState} from 'react';
import Typography from '@mui/material/Typography';
import {InteractiveMap, MAP_COLORS, StaticMap} from './GoogleMapView';
import type {MapLine, MapMarker} from './GoogleMapView';
import type {RouteDto, RouteStopDto} from '../types/api';
import type {LatLng} from '../types';
import {formatTime, MATCH_STATUS_LABELS} from '../utils/format';
import {hasLocation} from '../utils/googleMaps';

// מפת מסלול: תחנות האיסוף (ממוספרות לפי הסדר), העמותה, וקו המסלול המתוכנן.
// במעקב חי נוספים: המתנדב (זז בזמן אמת), הדרך שכבר נסע (מיומן המשלוח) והדרך שנשארה עד העמותה.

/** צבע מסלול הנסיעה בפועל */
export const TRAIL_COLOR = MAP_COLORS.volunteer;

const PICKED_UP = ['InTransit', 'Completed'];
const NOT_PICKED_UP = ['Confirmed', 'InPickup', 'AwaitingVolunteerConfirmation'];

/** משך התנועה של סמן המתנדב ממיקום למיקום (מ"ש) */
const MOVE_ANIMATION_MS = 1500;

/** קפיצה גדולה מזה (במעלות, בערך 2 ק"מ) - בלי אנימציה, למשל אחרי ניתוק ארוך */
const MAX_ANIMATED_JUMP_DEG = 0.02;

export interface LiveRouteMapProps {
    route: RouteDto;
    /** הדרך שהמתנדב כבר נסע (מיומן המשלוח) */
    trail?: LatLng[];
    /** המיקום הנוכחי של המתנדב */
    current?: LatLng | null;
    /** המתנדב בדרך עכשיו */
    live?: boolean;
    /** הדרך שנשארה מהמיקום הנוכחי (Polyline מקודד מ-Google). בלעדיה - קו ישר דרך התחנות שנשארו */
    remainingPolyline?: string | null;
    /** הכפתור שמפעיל מעקב אחרי המתנדב על המפה */
    followLabel?: string;
    height?: number;
    /** תמונת המפה מהשרת - כשאין מפה אינטראקטיבית */
    fallbackSrc: string;
}

const stopPosition = (stop: RouteStopDto): LatLng => ({lat: stop.latitude, lng: stop.longitude});

// ברירת מחדל קבועה (ולא [] חדש בכל רינדור) - כדי שהקווים לא ייבנו מחדש בכל צעד של האנימציה
const NO_TRAIL: LatLng[] = [];

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

/**
 * תיקון 35: המתנדב "נוסע" על המפה בתנועה רציפה בין עדכוני המיקום (כל כמה שניות), במקום לקפוץ ממקום למקום.
 * מחזיר את המיקום שמוצג כרגע. מי שביקש להפחית תנועה (prefers-reduced-motion) - בלי אנימציה.
 */
function useSmoothPosition(target: LatLng | null): LatLng | null {
    const [shown, setShown] = useState<LatLng | null>(target);
    const shownRef = useRef<LatLng | null>(target);
    const lat = target?.lat;
    const lng = target?.lng;

    useEffect(() => {
        shownRef.current = shown;
    }, [shown]);

    useEffect(() => {
        if (lat == null || lng == null) {
            setShown(null);
            return undefined;
        }

        const to: LatLng = {lat, lng};
        const from = shownRef.current;
        const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!from || reduceMotion || Math.abs(from.lat - to.lat) + Math.abs(from.lng - to.lng) > MAX_ANIMATED_JUMP_DEG) {
            setShown(to);
            return undefined;
        }

        let frame = 0;
        const start = performance.now();
        const tick = (now: DOMHighResTimeStamp) => {
            const t = Math.min(1, (now - start) / MOVE_ANIMATION_MS);
            const e = easeInOut(t);
            setShown({lat: from.lat + (to.lat - from.lat) * e, lng: from.lng + (to.lng - from.lng) * e});
            if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [lat, lng]);

    return shown;
}

export default function LiveRouteMap({
    route,
    trail = NO_TRAIL,
    current = null,
    live = false,
    remainingPolyline = null,
    followLabel = 'עקוב אחרי המתנדב',
    height = 460,
    fallbackSrc,
}: LiveRouteMapProps) {
    const shownPosition = useSmoothPosition(current);

    const stops = useMemo(() => route.stops.filter((s) => hasLocation(s.latitude, s.longitude)), [route]);
    const ngo: LatLng | null = useMemo(
        () => (hasLocation(route.ngoLatitude, route.ngoLongitude) ? {lat: route.ngoLatitude, lng: route.ngoLongitude} : null),
        [route]
    );

    // התחנות והעמותה לא משתנות בזמן שהמתנדב זז - נבנות פעם אחת לכל מצב של המסלול
    const fixedMarkers = useMemo<MapMarker[]>(() => {
        const markers: MapMarker[] = stops.map((stop) => ({
            id: `stop-${stop.matchId}`,
            position: stopPosition(stop),
            title: `איסוף מ${stop.supplierName ?? 'ספק'}`,
            color: MAP_COLORS.donor,
            glyph: String(stop.order),
            muted: PICKED_UP.includes(stop.status),
            info: (
                <>
                    <Typography sx={{fontWeight: 700}}>{stop.order}. איסוף מ{stop.supplierName ?? 'ספק'}</Typography>
                    {stop.address && <Typography variant="body2">{stop.address}</Typography>}
                    <Typography variant="body2">
                        {MATCH_STATUS_LABELS[stop.status] ?? stop.status}
                        {stop.pickedUpAt ? ` · נאסף ב-${formatTime(stop.pickedUpAt)}` : ''}
                    </Typography>
                </>
            ),
        }));

        if (ngo) {
            markers.push({
                id: 'ngo',
                position: ngo,
                title: route.ngoName ?? 'עמותה',
                color: MAP_COLORS.ngo,
                glyph: 'ע',
                zIndex: 500,
                info: (
                    <>
                        <Typography sx={{fontWeight: 700}}>{route.ngoName ?? 'עמותה'}</Typography>
                        {route.ngoAddress && <Typography variant="body2">{route.ngoAddress}</Typography>}
                    </>
                ),
            });
        }
        return markers;
    }, [stops, ngo, route.ngoName, route.ngoAddress]);

    const markers: MapMarker[] = shownPosition
        ? [
            ...fixedMarkers,
            {
                id: 'volunteer',
                position: shownPosition,
                title: route.volunteerName ?? 'המתנדב',
                variant: 'vehicle',
                pulse: live,
                zIndex: 2000,
                info: <Typography sx={{fontWeight: 700}}>{route.volunteerName ?? 'המתנדב'}</Typography>,
            },
        ]
        : fixedMarkers;

    // המסלול המתוכנן והדרך שכבר נסע - לא משתנים בכל צעד של האנימציה
    const plannedOpacity = live || trail.length > 1 ? 0.3 : 0.85;
    const baseLines = useMemo<MapLine[]>(() => {
        const lines: MapLine[] = [];
        const plannedPoints: LatLng[] = [...stops.map(stopPosition), ...(ngo ? [ngo] : [])];

        // המסלול המתוכנן. בזמן נסיעה הוא רק רקע חלש - הקווים החשובים הם מה שנסע ומה שנשאר
        if (route.polyline) {
            lines.push({id: 'planned', encodedPath: route.polyline, color: MAP_COLORS.ngo, weight: 5, opacity: plannedOpacity, zIndex: 1});
        } else if (plannedPoints.length > 1) {
            lines.push({id: 'planned', path: plannedPoints, color: MAP_COLORS.ngo, weight: 4, opacity: plannedOpacity, dashed: true, zIndex: 1});
        }

        // מה שהמתנדב כבר נסע (מיומן המשלוח)
        if (trail.length > 1) {
            lines.push({id: 'trail', path: trail, color: TRAIL_COLOR, weight: 5, opacity: 0.9, zIndex: 3});
        }
        return lines;
    }, [stops, ngo, route.polyline, plannedOpacity, trail]);

    const lines: MapLine[] = [...baseLines];

    // מה שנשאר: מהמיקום הנוכחי, דרך התחנות שעוד לא נאספו, עד העמותה
    if (live && shownPosition && ngo) {
        if (remainingPolyline) {
            lines.push({id: 'remaining', encodedPath: remainingPolyline, color: MAP_COLORS.ngo, weight: 5, dashed: true, zIndex: 2});
        } else {
            const ahead = stops.filter((s) => NOT_PICKED_UP.includes(s.status)).map(stopPosition);
            lines.push({id: 'remaining', path: [shownPosition, ...ahead, ngo], color: MAP_COLORS.ngo, weight: 4, dashed: true, zIndex: 2});
        }
    }

    return (
        <InteractiveMap
            markers={markers}
            lines={lines}
            height={height}
            fitKey={`route-${route.id}|${current ? 'with-volunteer' : 'plan'}`}
            followTarget={live && current ? current : null}
            followLabel={followLabel}
            fallback={<StaticMap src={fallbackSrc} alt={`מפת מסלול #${route.id}`} height={height} />}
        />
    );
}
