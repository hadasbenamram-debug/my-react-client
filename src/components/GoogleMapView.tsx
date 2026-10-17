import {useEffect, useMemo, useState, type ReactNode} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import {
    APIProvider,
    AdvancedMarker,
    InfoWindow,
    Map,
    Pin,
    useMap,
    useMapsLibrary,
} from '@vis.gl/react-google-maps';
import type {LatLng} from '../types';

// המפתח נקרא מקובץ .env בשורש הפרויקט: VITE_GOOGLE_MAPS_API_KEY=...
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
// DEMO_MAP_ID מספיק לפיתוח. לייצור אפשר ליצור Map ID משלך ב-Google Cloud
const MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';
const DEFAULT_CENTER: LatLng = {lat: 32.0853, lng: 34.7818};

export type MapEntityKind = 'donor' | 'ngo' | 'volunteer' | 'other';

export const MAP_COLORS: Record<MapEntityKind, string> = {
    donor: '#e08a1e', // תורם
    ngo: '#159aa0', // עמותה
    volunteer: '#33383a', // מתנדב
    other: '#8a8f91',
};

// עוטף את המפה: טוען את Google Maps בעברית, ומציג הסבר אם חסר מפתח
export interface MapShellProps {
    height?: number;
    children?: ReactNode;
}

export function MapShell({height = 480, children}: MapShellProps) {
    if (!API_KEY) {
        return (
            <Alert severity="warning" sx={{mb: 3}}>
                חסר מפתח Google Maps. צרי קובץ <b>.env</b> בשורש הפרויקט עם השורה{' '}
                <b dir="ltr">VITE_GOOGLE_MAPS_API_KEY=המפתח_שלך</b> והפעילי מחדש את <b dir="ltr">npm run dev</b>.
            </Alert>
        );
    }
    return (
        <APIProvider apiKey={API_KEY} language="he" region="IL">
            <Card
                dir="ltr"
                sx={{
                    height: {xs: Math.min(height, 380), md: height},
                    overflow: 'hidden',
                    p: 0,
                    mb: 3,
                }}
            >
                {children}
            </Card>
        </APIProvider>
    );
}

// מכוון את המפה כך שכל הסיכות ייראו
function FitBounds({positions}: {positions: LatLng[]}) {
    const map = useMap();
    const key = JSON.stringify(positions);
    useEffect(() => {
        if (!map || positions.length === 0) {
            return;
        }
        if (positions.length === 1) {
            map.setCenter(positions[0]);
            map.setZoom(14);
            return;
        }
        const bounds = new window.google.maps.LatLngBounds();
        positions.forEach((p: LatLng) => bounds.extend(p));
        map.fitBounds(bounds, 64);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, key]);
    return null;
}

// קו מסלול: Directions (נסיעה בכבישים). אם השירות לא מופעל בפרויקט, נצייר קו ישר
function RouteLayer({points}: {points: LatLng[]}) {
    const map = useMap();
    const routesLib = useMapsLibrary('routes');
    const key = JSON.stringify(points);
    useEffect(() => {
        if (!map || !routesLib || points.length < 2) {
            return undefined;
        }
        let polyline: google.maps.Polyline | null = null;
        const renderer = new routesLib.DirectionsRenderer({
            map,
            suppressMarkers: true,
            polylineOptions: {strokeColor: '#159aa0', strokeWeight: 5, strokeOpacity: 0.9},
        });
        const service = new routesLib.DirectionsService();
        service
            .route({
                origin: points[0],
                destination: points[points.length - 1],
                waypoints: points.slice(1, -1).map((p: LatLng): google.maps.DirectionsWaypoint => ({location: p, stopover: true})),
                travelMode: routesLib.TravelMode.DRIVING,
            })
            .then((result: google.maps.DirectionsResult) => renderer.setDirections(result))
            .catch((err: unknown) => {
                console.warn('Directions לא זמין, מצייר קו ישר:', err);
                polyline = new window.google.maps.Polyline({
                    map,
                    path: points,
                    strokeColor: '#159aa0',
                    strokeWeight: 4,
                    strokeOpacity: 0.8,
                });
            });
        return () => {
            renderer.setMap(null);
            if (polyline) {
                polyline.setMap(null);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map, routesLib, key]);
    return null;
}

export type MarkerId = string | number;

export interface MapMarker {
    id: MarkerId;
    position: LatLng;
    title?: string;
    color?: string;
    glyph?: string;
    /** תוכן שמוצג בחלונית המידע בלחיצה על הסיכה */
    info?: ReactNode;
}

export interface MapViewProps {
    markers?: MapMarker[];
    /** נקודות המסלול בסדר הנסיעה (אופציונלי) */
    routePoints?: LatLng[] | null;
}

export function MapView({markers = [], routePoints = null}: MapViewProps) {
    const [selectedId, setSelectedId] = useState<MarkerId | null>(null);
    const positions = useMemo(() => markers.map((m) => m.position), [markers]);
    const selected = markers.find((m) => m.id === selectedId);

    return (
        <Map
            mapId={MAP_ID}
            defaultCenter={DEFAULT_CENTER}
            defaultZoom={9}
            gestureHandling="greedy"
            style={{width: '100%', height: '100%'}}
        >
            <FitBounds positions={positions} />
            {markers.map((m) => (
                <AdvancedMarker
                    key={m.id}
                    position={m.position}
                    title={m.title}
                    onClick={() => setSelectedId(m.id)}
                >
                    <Pin
                        background={m.color || MAP_COLORS.other}
                        borderColor="#ffffff"
                        glyphColor="#ffffff"
                        glyph={m.glyph}
                    />
                </AdvancedMarker>
            ))}
            {selected ? (
                <InfoWindow
                    position={selected.position}
                    pixelOffset={[0, -40]}
                    onCloseClick={() => setSelectedId(null)}
                >
                    <Box dir="rtl" sx={{textAlign: 'right', minWidth: 140, color: '#101010'}}>
                        {selected.info}
                    </Box>
                </InfoWindow>
            ) : null}
            {routePoints && routePoints.length > 1 ? <RouteLayer points={routePoints} /> : null}
        </Map>
    );
}

// הופך כתובות לנקודות על המפה (Geocoding). אם לתחנה יש latitude/longitude משתמשים בהם
// חייב לרוץ בתוך MapShell
export interface GeocodableStop {
    latitude?: number | string | null;
    longitude?: number | string | null;
    address?: string | null;
}

export type GeocodedStop<S extends GeocodableStop> = S & {position: LatLng | null};

export function useGeocodedStops<S extends GeocodableStop>(stops: S[] | null | undefined): GeocodedStop<S>[] {
    const geocodingLib = useMapsLibrary('geocoding');
    const [result, setResult] = useState<GeocodedStop<S>[]>([]);
    const key = JSON.stringify(stops || []);

    useEffect(() => {
        if (!geocodingLib || !stops || stops.length === 0) {
            setResult([]);
            return undefined;
        }
        let cancelled = false;
        const geocoder = new geocodingLib.Geocoder();

        Promise.all(
            stops.map(async (stop: S): Promise<GeocodedStop<S>> => {
                if (stop.latitude != null && stop.longitude != null) {
                    return {...stop, position: {lat: Number(stop.latitude), lng: Number(stop.longitude)}};
                }
                if (!stop.address) {
                    return {...stop, position: null};
                }
                try {
                    const res = await geocoder.geocode({address: stop.address, region: 'IL'});
                    const loc = res.results[0]?.geometry.location;
                    return {...stop, position: loc ? {lat: loc.lat(), lng: loc.lng()} : null};
                } catch (err: unknown) {
                    console.warn('Geocoding נכשל עבור:', stop.address, err);
                    return {...stop, position: null};
                }
            })
        ).then((list: GeocodedStop<S>[]) => {
            if (!cancelled) {
                setResult(list);
            }
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geocodingLib, key]);

    return result;
}
