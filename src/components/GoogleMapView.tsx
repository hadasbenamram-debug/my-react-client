import React, {useEffect, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {keyframes} from '@mui/material/styles';
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import {APIProvider, AdvancedMarker, InfoWindow, Map, Pin, Polyline, useMap} from '@vis.gl/react-google-maps';
import type {BrowserMapConfigDto} from '../types/api';
import type {LatLng} from '../types';
import {authHeaders, getCurrentUser} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {googleMapsAuthFailed, googleMapsAuthProblem, loadBrowserMapConfig, onGoogleMapsAuthFailure} from '../utils/googleMaps';
import type {GoogleMapsAuthProblem} from '../utils/googleMaps';

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
    /** vehicle = עיגול עם משאית (המתנדב). stop = תחנת איסוף עגולה (תיקון 61). ברירת מחדל: סיכה */
    variant?: 'pin' | 'vehicle' | 'stop';
    /** תיקון 61 (stop): התחנה נאספה - העיגול נצבע בצבע המסלול עם ✓ */
    done?: boolean;
    /** תיקון 61 (stop): התחנה הבאה במסלול - מהבהבת */
    next?: boolean;
    /** תיקון 61 (vehicle): כיוון הנסיעה במעלות (0 = צפון) - חץ קטן על העיגול */
    heading?: number | null;
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

// ───────────────────────── למה מוצגת תמונה ולא מפה דינאמית ─────────────────────────

/**
 * תיקון 35: בעבר, כשלא היה מפתח דפדפן (או ש-Google דחה אותו), המפה עברה בשקט לתמונה -
 * ולא היה ברור למה אי אפשר להזיז / להגדיל אותה. עכשיו מוצג הסבר: למנהל - מה בדיוק לתקן, לשאר - שורה קצרה.
 *   NotConfigured   - בשרת לא הוגדר GoogleMaps:BrowserApiKey
 *   SameAsServerKey - הוגדר בטעות מפתח השרת (שלא נשלח לדפדפן אף פעם)
 *   AuthFailed      - Google דחה את המפתח (כתובת האתר לא ברשימה המותרת, ה-API לא הופעל, אין Billing)
 *   LoadFailed      - הסקריפט של Google Maps לא נטען (רשת / חוסם פרסומות)
 *   Unavailable     - לא ניתן לטעון את ההגדרות מהשרת
 */
export type MapFallbackReason = 'NotConfigured' | 'SameAsServerKey' | 'AuthFailed' | 'LoadFailed' | 'Unavailable';

const isAdminUser = (): boolean => String(getCurrentUser().role ?? '').toLowerCase() === 'admin';

const KEY_SETUP_STEPS = (origin: string) => (
    <>
        צרו ב-Google Cloud מפתח <strong>נפרד</strong> ממפתח השרת, והגבילו אותו: Application restrictions = Websites
        {' '}(<Box component="span" dir="ltr">{origin}/*</Box> וכתובת האתר באוויר), ו-API restrictions = Maps JavaScript API בלבד.
        {' '}את המפתח שומרים בשרת בלבד, בהגדרה <code>GoogleMaps:BrowserApiKey</code> (User Secrets), והשרת נותן אותו רק למשתמש מחובר.
    </>
);

const Ltr = ({children}: {children: ReactNode}) => <Box component="span" dir="ltr">{children}</Box>;

// תיקון 40: מה לתקן ב-Google Cloud לפי קוד השגיאה ש-Google כתב בקונסול. null = אין הסבר ייעודי לקוד
function authFailureFix(code: string | null, origin: string, blockedUrl: string | null): ReactNode {
    switch (code) {
        case 'RefererNotAllowedMapError':
            return (
                <>
                    הכתובת <Ltr>{blockedUrl ?? `${origin}/`}</Ltr> לא מותרת למפתח הזה. ב-Credentials לחצו Show key ומצאו את המפתח שמסתיים ב-4 התווים
                    {' '}שלמעלה. בהגבלת Websites שלו הוסיפו <Ltr>{origin}/*</Ltr> ולחצו Save. אם הכתובת כבר שם - כנראה ב-BrowserApiKey שמור מפתח אחר.
                </>
            );
        case 'ApiTargetBlockedMapError':
            return (
                <>
                    המפתח מוגבל ל-API אחר. ב-Credentials פתחו את המפתח, ובחלק API restrictions בחרו את <strong>Maps JavaScript API</strong>
                    {' '}(לא Maps Static API, Places או Geocoding) ולחצו Save.
                </>
            );
        case 'ApiNotActivatedMapError':
            return (
                <>
                    ה-Maps JavaScript API לא מופעל בפרויקט של המפתח. ב-Google Cloud, באותו פרויקט:
                    {' '}<Ltr>APIs &amp; Services → Library → Maps JavaScript API → Enable</Ltr>.
                </>
            );
        case 'BillingNotEnabledMapError':
        case 'ClientBillingNotEnabledMapError':
            return <>לפרויקט של המפתח אין חשבון חיוב (Billing) פעיל. ב-Google Cloud, בתפריט Billing, קשרו חשבון חיוב לפרויקט.</>;
        case 'InvalidKeyMapError':
        case 'InvalidKey':
            return (
                <>
                    Google לא מכיר את המפתח - כנראה הוא הועתק חלקית או עם רווח או מירכאות. ב-Credentials לחצו Show key, העתיקו שוב,
                    {' '}הגדירו מחדש את <code>GoogleMaps:BrowserApiKey</code> והפעילו מחדש את השרת.
                </>
            );
        case 'ExpiredKeyMapError':
            return <>Google עוד לא מכיר את המפתח (מפתח שנוצר עכשיו) או שהוא בוטל. המתינו כמה דקות; אם זה לא עובר - צרו מפתח חדש.</>;
        case 'DeletedApiProjectMapError':
        case 'ApiProjectMapError':
        case 'ProjectDeniedMapError':
            return <>יש בעיה בפרויקט של המפתח ב-Google Cloud (נמחק, מושעה או לא נמצא). צרו מפתח חדש בפרויקט פעיל.</>;
        case 'OverQuotaMapError':
            return <>הפרויקט עבר את מכסת השימוש של Maps JavaScript API. בדקו את ה-Quotas בפרויקט, או המתינו לאיפוס היומי.</>;
        default:
            return null;
    }
}

export function MapFallbackNotice({reason, problem = null, keyHint = null}: {
    reason: MapFallbackReason;
    /** מה Google כתב בקונסול כשדחה את המפתח (רק ב-AuthFailed) */
    problem?: GoogleMapsAuthProblem | null;
    /** 4 התווים האחרונים של מפתח הדפדפן - כדי לזהות ב-Google Cloud איזה מפתח בשימוש */
    keyHint?: string | null;
}) {
    if (!isAdminUser()) {
        return (
            <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                המפה הדינאמית אינה זמינה כרגע, ולכן מוצגת תמונת מפה.
            </Typography>
        );
    }

    const origin = window.location.origin;
    const text: Record<MapFallbackReason, ReactNode> = {
        NotConfigured: (
            <>
                מוצגת תמונת מפה (בלי הזזה וזום) כי בשרת לא הוגדר מפתח דפדפן של Google Maps.
                {' '}כדי להפעיל מפה דינאמית ומעקב חי: {KEY_SETUP_STEPS(origin)}
            </>
        ),
        SameAsServerKey: (
            <>
                כמפתח הדפדפן הוגדר אותו מפתח של השרת. מטעמי אבטחה מפתח השרת אף פעם לא נשלח לדפדפן, ולכן מוצגת תמונה.
                {' '}{KEY_SETUP_STEPS(origin)}
            </>
        ),
        AuthFailed: (() => {
            const code = problem?.code ?? null;
            const fix = authFailureFix(code, origin, problem?.blockedUrl ?? null);
            return (
                <>
                    Google דחה את מפתח הדפדפן, ולכן מוצגת תמונת מפה.
                    {code ? <> קוד השגיאה מ-Google: <strong><Ltr>{code}</Ltr></strong>.</> : null}
                    {keyHint ? <> 4 התווים האחרונים של המפתח שבשימוש: <strong><Ltr>{keyHint}</Ltr></strong>.</> : null}
                    <br />
                    {fix ?? (
                        <>
                            בדקו ב-Google Cloud שהכתובת <Ltr>{origin}/*</Ltr> מופיעה בהגבלת ה-Websites של המפתח,
                            {' '}שה-Maps JavaScript API מופעל בפרויקט ומותר למפתח, ושהחיוב (Billing) פעיל.
                            {' '}הסיבה המדויקת מופיעה גם בקונסול של הדפדפן (<Ltr>F12 → Console</Ltr>), בשורה שמתחילה ב-
                            <Ltr>Google Maps JavaScript API error</Ltr>.
                        </>
                    )}
                    <br />
                    אחרי Save ב-Google Cloud השינוי נקלט תוך עד 5 דקות, ואז צריך רענון מלא של הדף (Ctrl+F5).
                </>
            );
        })(),
        LoadFailed: <>לא ניתן לטעון את Google Maps בדפדפן (חיבור לאינטרנט / חוסם פרסומות / מדיניות רשת), ולכן מוצגת תמונת מפה.</>,
        Unavailable: <>לא ניתן לטעון כרגע את הגדרות המפה מהשרת, ולכן מוצגת תמונת מפה.</>,
    };

    return <Alert severity="info" sx={{mb: 1.5}}>{text[reason]}</Alert>;
}

const pulse = keyframes`
    0% { transform: scale(0.9); opacity: 0.9; }
    100% { transform: scale(1.9); opacity: 0; }
`;

// תיקון 61: תחנה שנאספה "קופצת" כשהיא נצבעת
const popIn = keyframes`
    0% { transform: scale(0.6); }
    60% { transform: scale(1.25); }
    100% { transform: scale(1); }
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
    const [failure, setFailure] = useState<MapFallbackReason | null>(googleMapsAuthFailed() ? 'AuthFailed' : null);
    const [authProblem, setAuthProblem] = useState<GoogleMapsAuthProblem>(googleMapsAuthProblem);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [fitRequest, setFitRequest] = useState<number>(0);
    const [following, setFollowing] = useState<boolean>(false);

    useEffect(() => {
        let cancelled = false;
        void loadBrowserMapConfig().then((loaded) => {
            if (!cancelled) setConfig(loaded);
        });
        // נקרא כש-Google דוחה את המפתח, ושוב אם הסיבה (קוד השגיאה מהקונסול) מגיעה אחרי זה
        const unsubscribe = onGoogleMapsAuthFailure(() => {
            setFailure('AuthFailed');
            setAuthProblem(googleMapsAuthProblem());
        });
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

    if (!config || !config.enabled || !config.apiKey || failure) {
        const reason: MapFallbackReason = failure ?? (config ? config.disabledReason ?? 'NotConfigured' : 'Unavailable');
        const keyHint = config?.apiKey && config.apiKey.length > 8 ? config.apiKey.slice(-4) : null;
        return (
            <>
                <MapFallbackNotice reason={reason} problem={authProblem} keyHint={keyHint} />
                {fallback}
            </>
        );
    }

    const selected = markers.find((m) => m.id === selectedId) ?? null;
    const positions = markers.map((m) => m.position);
    const fitTargets = fitPositions && fitPositions.length > 0 ? fitPositions : positions;

    return (
        <APIProvider
            apiKey={config.apiKey}
            language={config.language}
            region={config.region}
            onError={() => setFailure((current) => current ?? 'LoadFailed')}
        >
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

/** תיקון 61: תחנת איסוף עגולה - לבנה עם מסגרת בצבע המסלול, ונצבעת (עם ✓) כשאוספים אותה */
export function StopBadge({color, glyph, done, next, muted}: {color: string; glyph?: string; done?: boolean; next?: boolean; muted?: boolean}) {
    return (
        <Box
            key={done ? 'done' : 'open'}
            sx={{
                position: 'relative',
                width: 30,
                height: 30,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: done ? color : '#fff',
                color: done ? '#fff' : color,
                border: `3px solid ${color}`,
                opacity: muted ? 0.35 : 1,
                fontWeight: 700,
                fontSize: 14,
                lineHeight: 1,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
                animation: done ? `${popIn} 0.6s ease-out` : undefined,
                '&::after': next && !muted
                    ? {
                        content: '""',
                        position: 'absolute',
                        inset: -6,
                        borderRadius: '50%',
                        border: `2px solid ${color}`,
                        animation: `${pulse} 1.8s ease-out infinite`,
                    }
                    : undefined,
            }}
        >
            {done ? '✓' : glyph}
        </Box>
    );
}

function MarkerView({marker, onSelect}: {marker: MapMarker; onSelect: () => void}) {
    if (marker.variant === 'stop') {
        return (
            <AdvancedMarker
                position={marker.position}
                title={marker.title}
                zIndex={marker.zIndex ?? (marker.done ? 600 : 800)}
                onClick={onSelect}
                anchorLeft="-50%"
                anchorTop="-50%"
            >
                <StopBadge color={marker.color ?? MAP_COLORS.other} glyph={marker.glyph} done={marker.done} next={marker.next} muted={marker.muted} />
            </AdvancedMarker>
        );
    }

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
                    {/* תיקון 61: חץ קטן לכיוון הנסיעה */}
                    {marker.heading != null && (
                        <Box sx={{position: 'absolute', inset: -11, transform: `rotate(${marker.heading}deg)`, pointerEvents: 'none'}}>
                            <Box sx={{
                                position: 'absolute', top: 0, left: '50%', ml: '-6px', width: 0, height: 0,
                                borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderBottom: `9px solid ${color}`,
                            }} />
                        </Box>
                    )}
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
