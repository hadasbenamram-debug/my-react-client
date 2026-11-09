import React from 'react';
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

export default function LiveRouteMap({
    route,
    trail = [],
    current = null,
    live = false,
    remainingPolyline = null,
    followLabel = 'עקוב אחרי המתנדב',
    height = 460,
    fallbackSrc,
}: LiveRouteMapProps) {
    const stops = route.stops.filter((s) => hasLocation(s.latitude, s.longitude));
    const ngo: LatLng | null = hasLocation(route.ngoLatitude, route.ngoLongitude)
        ? {lat: route.ngoLatitude, lng: route.ngoLongitude}
        : null;

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

    if (current) {
        markers.push({
            id: 'volunteer',
            position: current,
            title: route.volunteerName ?? 'המתנדב',
            variant: 'vehicle',
            pulse: live,
            zIndex: 2000,
            info: <Typography sx={{fontWeight: 700}}>{route.volunteerName ?? 'המתנדב'}</Typography>,
        });
    }

    const lines: MapLine[] = [];
    const plannedPoints: LatLng[] = [...stops.map(stopPosition), ...(ngo ? [ngo] : [])];

    // המסלול המתוכנן. בזמן נסיעה הוא רק רקע חלש - הקווים החשובים הם מה שנסע ומה שנשאר
    const plannedOpacity = live || trail.length > 1 ? 0.3 : 0.85;
    if (route.polyline) {
        lines.push({id: 'planned', encodedPath: route.polyline, color: MAP_COLORS.ngo, weight: 5, opacity: plannedOpacity, zIndex: 1});
    } else if (plannedPoints.length > 1) {
        lines.push({id: 'planned', path: plannedPoints, color: MAP_COLORS.ngo, weight: 4, opacity: plannedOpacity, dashed: true, zIndex: 1});
    }

    // מה שהמתנדב כבר נסע
    if (trail.length > 1) {
        lines.push({id: 'trail', path: trail, color: TRAIL_COLOR, weight: 5, opacity: 0.9, zIndex: 3});
    }

    // מה שנשאר: מהמיקום הנוכחי, דרך התחנות שעוד לא נאספו, עד העמותה
    if (live && current && ngo) {
        if (remainingPolyline) {
            lines.push({id: 'remaining', encodedPath: remainingPolyline, color: MAP_COLORS.ngo, weight: 5, dashed: true, zIndex: 2});
        } else {
            const ahead = stops.filter((s) => NOT_PICKED_UP.includes(s.status)).map(stopPosition);
            lines.push({id: 'remaining', path: [current, ...ahead, ngo], color: MAP_COLORS.ngo, weight: 4, dashed: true, zIndex: 2});
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
