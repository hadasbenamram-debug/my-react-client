import React, {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import {keyframes} from '@mui/material/styles';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import {APIProvider, AdvancedMarker, InfoWindow, Map, Pin, Polyline, useMap} from '@vis.gl/react-google-maps';
import type {BrowserMapConfigDto} from '../types/api';
import type {LatLng} from '../types';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {googleMapsAuthFailed, loadBrowserMapConfig, onGoogleMapsAuthFailure} from '../utils/googleMaps';

// שני סוגי מפות:
//  - InteractiveMap: מפה של Google בדפדפן - אפשר להזיז, לעשות זום וללחוץ על סיכות. המפתח הוא מפתח דפדפן נפרד
//    (Maps JavaScript API בלבד, מוגבל לכתובות האתר) שהשרת נותן רק למשתמש מחובר (utils/googleMaps.ts).
//  - StaticMap: תמונת מפה שהשרת מביא מ-Google עם מפתח השרת. משמשת גיבוי כשאין מפתח דפדפן
//    או כש-Google דחה אותו - כך תמיד מוצגת מפה.

export type MapEntityKind = 'donor' | 'ngo' | 'volunteer' | 'other';

// אותם צבעים שהשרת משתמש בהם לסיכות (MapService), כדי שהמקרא יתאים למפה
export const MAP_COLORS: Record<MapEntityKind, string> = {
    donor: '#e08a1e', // תורם
    ngo: '#159aa0', // עמותה
    volunteer: '#33383a', // מתנדב
    other: '#8a8f91',
};

// ───────────────────────── תמונת מפה מהשרת ─────────────────────────

export interface StaticMapProps {
    /** כתובת ה-API שמחזירה את תמונת המפה, למשל /api/map/routes/5/image */
    src: string;
    /** תיאור התמונה (נגישות) */
    alt: string;
    /** גובה המקום שנשמר למפה בזמן הטעינה */
    height?: number;
}

// מביא את תמונת המפה מהשרת עם הטוקן (תגית img לא יכולה לשלוח כותרת Authorization) ומציג אותה
export function StaticMap({src, alt, height = 480}: StaticMapProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        setImageUrl(null);
        setError(null);

        fetch(src, {headers: authHeaders()})
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(await readErrorMessage(res, 'לא ניתן להציג את המפה כרגע.'));
                }
                return res.blob();
            })
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setImageUrl(objectUrl);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'לא ניתן להציג את המפה כרגע.');
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (error) {
        return <Alert severity="warning" sx={{mb: 3}}>{error}</Alert>;
    }

    return (
        <Card sx={{p: 0, mb: 3, overflow: 'hidden'}}>
            {imageUrl ? (
                <Box component="img" src={imageUrl} alt={alt} sx={{display: 'block', width: '100%', height: 'auto'}} />
            ) : (
                <Box sx={{height: {xs: Math.min(height, 380), md: height}, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <CircularProgress />
                </Box>
            )}
        </Card>
    );
}

// ───────────────────────── מפה אינטראקטיבית ─────────────────────────

/** סמן על המפה */
export interface MapMarker {
    id: string;
    position: LatLng;
    title?: string;
    color?: string;
    /** טקסט קצר בתוך הסיכה (מספר התחנה, ע = עמותה) */
    glyph?: string;
    /** vehicle = עיגול עם משאית (המתנדב). ברירת מחדל: סיכה */
    variant?: 'pin' | 'vehicle';
    /** סיכה אפורה - למשל תחנה שכבר נאספה */
    muted?: boolean;
    /** הבהוב סביב הסמן - המתנדב בשידור חי */
    pulse?: boolean;
    /** מה מוצג בחלונית בלחיצה על הסמן */
    info?: ReactNode;
    zIndex?: number;
}

/** קו על המפה: רשימת נקודות, או Polyline מקודד של Google */
export interface MapLine {
    id: string;
    path?: LatLng[];
    encodedPath?: string | null;
    color: string;
    weight?: number;
    opacity?: number;
    dashed?: boolean;
    zIndex?: number;
}

export interface InteractiveMapProps {
    markers: MapMarker[];
    lines?: MapLine[];
    height?: number;
    /** מה מציגים כשאין מפה אינטראקטיבית (אין מפתח דפדפן / Google דחה אותו) - בדרך כלל StaticMap */
    fallback: ReactNode;
    /** כשהערך משתנה, המפה מתמקדת מחדש בכל הסמנים. עדכוני מיקום לא מזיזים את המפה למי שגולל אותה */
    fitKey?: string;
    /** נקודה שזזה (המתנדב). כשיש - מופיע כפתור "עקוב", ובמצב מעקב המפה זזה אחריה בכל עדכון */
    followTarget?: LatLng | null;
    followLabel?: string;
    /** להתמקד רק בנקודות האלה (למשל מסלול אחד מתוך כמה) ולא בכל הסמנים. ריק / לא נשלח = כל הסמנים */
    fitPositions?: LatLng[];
    /** נקרא בלחיצה על "הצג הכול" - כדי שהדף יבטל בחירה של מסלול אחד */
    onShowAll?: () => void;
}

const DEFAULT_CENTER: LatLng = {lat: 31.5, lng: 34.9};
const DEFAULT_ZOOM = 8;

const pulse = keyframes`
    0% { transform: scale(0.9); opacity: 0.9; }
    100% { transform: scale(1.9); opacity: 0; }
`;

export function InteractiveMap({
    markers,
    lines = [],
    height = 480,
    fallback,
    fitKey = '',
    followTarget = null,
    followLabel = 'עקוב',
    fitPositions,
    onShowAll,
}: InteractiveMapProps) {
    // undefined = עוד טוען את ההגדרות, null = אין מפה אינטראקטיבית
    const [config, setConfig] = useState<BrowserMapConfigDto | null | undefined>(undefined);
    const [failed, setFailed] = useState<boolean>(googleMapsAuthFailed());
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fitRequest, setFitRequest] = useState<number>(0);
    const [following, setFollowing] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        void loadBrowserMapConfig().then((loaded) => {
            if (!cancelled) setConfig(loaded);
        });
        const unsubscribe = onGoogleMapsAuthFailure(() => setFailed(true));
        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const boxHeight = {xs: Math.min(height, 380), md: height};

    if (config === undefined) {
        return (
            <Card sx={{p: 0, mb: 3, height: boxHeight, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <CircularProgress />
            </Card>
        );
    }

    if (!config || !config.enabled || !config.apiKey || failed) {
        return <>{fallback}</>;
    }

    const selected = markers.find((m) => m.id === selectedId) ?? null;
    const positions = markers.map((m) => m.position);
    const fitTargets = fitPositions && fitPositions.length > 0 ? fitPositions : positions;

    return (
        <APIProvider apiKey={config.apiKey} language={config.language} region={config.region} onError={() => setFailed(true)}>
            <Card dir="ltr" sx={{position: 'relative', height: boxHeight, overflow: 'hidden', p: 0, mb: 3}}>
                <Map
                    mapId={config.mapId}
                    defaultCenter={DEFAULT_CENTER}
                    defaultZoom={DEFAULT_ZOOM}
                    gestureHandling="greedy"
                    clickableIcons={false}
                    streetViewControl={false}
                    mapTypeControl={false}
                    reuseMaps
                    style={{width: '100%', height: '100%'}}
                    onClick={() => setSelectedId(null)}
                    onDragstart={() => setFollowing(false)}
                >
                    <FitToMarkers positions={fitTargets} fitKey={`${fitKey}|${fitRequest}`} />
                    <FollowPosition position={following ? followTarget : null} />

                    {lines.map((line) => (
                        <MapLineView key={line.id} line={line} />
                    ))}

                    {markers.map((marker) => (
                        <MarkerView key={marker.id} marker={marker} onSelect={() => setSelectedId(marker.id)} />
                    ))}

                    {selected?.info ? (
                        <InfoWindow
                            position={selected.position}
                            pixelOffset={[0, selected.variant === 'vehicle' ? -24 : -40]}
                            onCloseClick={() => setSelectedId(null)}
                        >
                            <Box dir="rtl" sx={{textAlign: 'right', minWidth: 160, color: '#101010', fontFamily: "'Heebo', Arial, sans-serif"}}>
                                {selected.info}
                            </Box>
                        </InfoWindow>
                    ) : null}
                </Map>

                <Stack direction="row" spacing={1} dir="rtl" sx={{position: 'absolute', top: 10, left: 10}}>
                    {positions.length > 1 && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<CenterFocusStrongIcon />}
                            onClick={() => {
                                setFollowing(false);
                                setFitRequest((n) => n + 1);
                                onShowAll?.();
                            }}
                            sx={{py: 0.5, px: 1.5, bgcolor: '#fff', color: '#101010', boxShadow: 2}}
                        >
                            הצג הכול
                        </Button>
                    )}
                    {followTarget && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<MyLocationIcon />}
                            onClick={() => setFollowing((f) => !f)}
                            sx={{
                                py: 0.5,
                                px: 1.5,
                                boxShadow: 2,
                                bgcolor: following ? 'primary.dark' : '#fff',
                                color: following ? '#fff' : '#101010',
                            }}
                        >
                            {followLabel}
                        </Button>
                    )}
                </Stack>
            </Card>
        </APIProvider>
    );
}

// מתמקד בכל הסמנים: בפעם הראשונה שיש סמנים, וכל פעם ש-fitKey משתנה (למשל לחיצה על "הצג הכול").
// עדכון מיקום של המתנדב לא מזיז את המפה - מי שגולל / עושה זום לא "נזרק" חזרה.
function FitToMarkers({positions, fitKey}: {positions: LatLng[]; fitKey: string}) {
    const map = useMap();
    const latest = useRef<LatLng[]>(positions);
    const hasPositions = positions.length > 0;

    useEffect(() => {
        latest.current = positions;
    });

    useEffect(() => {
        const points = latest.current;
        if (!map || points.length === 0) return;
        if (points.length === 1) {
            map.setCenter(points[0]);
            map.setZoom(15);
            return;
        }
        const bounds = new google.maps.LatLngBounds();
        points.forEach((p) => bounds.extend(p));
        map.fitBounds(bounds, 56);
    }, [map, fitKey, hasPositions]);

    return null;
}

function FollowPosition({position}: {position: LatLng | null}) {
    const map = useMap();
    const lat = position?.lat;
    const lng = position?.lng;

    useEffect(() => {
        if (map && lat != null && lng != null) map.panTo({lat, lng});
    }, [map, lat, lng]);

    return null;
}

function MarkerView({marker, onSelect}: {marker: MapMarker; onSelect: () => void}) {
    if (marker.variant === 'vehicle') {
        const color = marker.color ?? MAP_COLORS.volunteer;
        return (
            <AdvancedMarker
                position={marker.position}
                title={marker.title}
                zIndex={marker.zIndex ?? 1000}
                onClick={onSelect}
                anchorLeft="-50%"
                anchorTop="-50%"
            >
                <Box
                    sx={{
                        position: 'relative',
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        bgcolor: color,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid #fff',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
                        '&::after': marker.pulse
                            ? {
                                content: '""',
                                position: 'absolute',
                                inset: -7,
                                borderRadius: '50%',
                                border: `3px solid ${color}`,
                                animation: `${pulse} 1.8s ease-out infinite`,
                            }
                            : undefined,
                    }}
                >
                    <LocalShippingIcon sx={{fontSize: 20}} />
                </Box>
            </AdvancedMarker>
        );
    }

    return (
        <AdvancedMarker position={marker.position} title={marker.title} zIndex={marker.zIndex} onClick={onSelect}>
            <Pin
                background={marker.muted ? '#c3c8c9' : marker.color ?? MAP_COLORS.other}
                borderColor="#ffffff"
                glyphColor="#ffffff"
                glyphText={marker.glyph}
            />
        </AdvancedMarker>
    );
}

function MapLineView({line}: {line: MapLine}) {
    const weight = line.weight ?? 4;
    const opacity = line.opacity ?? 0.9;

    // קו מקווקו: הקו עצמו שקוף, ומעליו מקפים קצרים שחוזרים לאורכו
    const dashes: google.maps.IconSequence[] | undefined = line.dashed
        ? [{icon: {path: 'M 0,-1 0,1', strokeOpacity: opacity, strokeColor: line.color, scale: weight}, offset: '0', repeat: '16px'}]
        : undefined;

    return (
        <Polyline
            path={line.path}
            encodedPath={line.encodedPath ?? undefined}
            strokeColor={line.color}
            strokeWeight={weight}
            strokeOpacity={line.dashed ? 0 : opacity}
            icons={dashes}
            zIndex={line.zIndex}
            clickable={false}
        />
    );
}
