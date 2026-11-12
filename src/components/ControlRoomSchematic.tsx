import type {LatLng} from '../types';

// תיקון 61: מפה סכמטית לחדר הבקרה - כשאין מפת Google בדפדפן (אין מפתח / נחסם), עדיין רואים הכול:
// המסלולים, הדרך שכבר נסעו, התחנות (נצבעות כשנאספות), העמותות והרכבים שנוסעים בזמן אמת.

export interface SchematicStop {
    id: string;
    position: LatLng;
    label: string;
    done: boolean;
    next: boolean;
}

export interface SchematicRoute {
    id: number;
    color: string;
    planned: LatLng[];
    trail: LatLng[];
    stops: SchematicStop[];
    ngo: {position: LatLng; name: string} | null;
    vehicle: {position: LatLng; heading: number | null; name: string; stale: boolean} | null;
}

const W = 1000;
const H = 620;
const PAD = 70;

export default function ControlRoomSchematic({routes, selectedId, onSelect}: {
    routes: SchematicRoute[];
    selectedId: number | null;
    onSelect: (id: number | null) => void;
}) {
    const focus = routes.filter((r) => selectedId == null || r.id === selectedId);
    const all: LatLng[] = focus.flatMap((r) => [
        ...r.planned, ...r.trail, ...r.stops.map((s) => s.position),
        ...(r.ngo ? [r.ngo.position] : []), ...(r.vehicle ? [r.vehicle.position] : []),
    ]);
    if (all.length === 0) return null;

    // הקרנה פשוטה: קו אורך מוכפל ב-cos של קו הרוחב, כדי שהמרחקים ייראו נכון
    const minLat = Math.min(...all.map((p) => p.lat));
    const maxLat = Math.max(...all.map((p) => p.lat));
    const minLng = Math.min(...all.map((p) => p.lng));
    const maxLng = Math.max(...all.map((p) => p.lng));
    const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const spanX = Math.max((maxLng - minLng) * k, 0.004);
    const spanY = Math.max(maxLat - minLat, 0.004);
    const scale = Math.min((W - 2 * PAD) / spanX, (H - 2 * PAD) / spanY);
    const offX = (W - spanX * scale) / 2;
    const offY = (H - spanY * scale) / 2;
    const xy = (p: LatLng) => ({x: offX + (p.lng - minLng) * k * scale, y: offY + (maxLat - p.lat) * scale});
    const path = (pts: LatLng[]) => pts.map((p, i) => {
        const {x, y} = xy(p);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');

    const ngos = new Map<string, {position: LatLng; name: string}>();
    routes.forEach((r) => {
        if (r.ngo) ngos.set(`${r.ngo.position.lat},${r.ngo.position.lng}`, r.ngo);
    });

    return (
        <svg className="cr-schematic" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="מפה סכמטית של המסלולים הפעילים"
            onClick={() => onSelect(null)}>
            <defs>
                <pattern id="cr-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M40 0H0V40" fill="none" stroke="rgba(14,109,114,0.08)" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width={W} height={H} rx="22" fill="#f4f8f8" />
            <rect width={W} height={H} rx="22" fill="url(#cr-grid)" />

            {routes.map((r) => {
                const dim = selectedId != null && r.id !== selectedId;
                return (
                    <g key={r.id} opacity={dim ? 0.18 : 1} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} style={{cursor: 'pointer'}}>
                        {r.planned.length > 1 && (
                            <path d={path(r.planned)} fill="none" stroke={r.color} strokeWidth="4" strokeOpacity="0.3"
                                strokeDasharray="10 9" strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {r.trail.length > 1 && (
                            <path d={path(r.trail)} fill="none" stroke={r.color} strokeWidth="6" strokeOpacity="0.9"
                                strokeLinecap="round" strokeLinejoin="round" />
                        )}
                        {r.stops.map((s) => {
                            const {x, y} = xy(s.position);
                            return (
                                <g key={s.id} className={s.done ? 'cr-stop is-done' : 'cr-stop'} transform={`translate(${x} ${y})`}>
                                    {s.next && <circle className="cr-ring" r="15" fill="none" stroke={r.color} strokeWidth="2.5" />}
                                    <circle r="14" fill={s.done ? r.color : '#ffffff'} stroke={r.color} strokeWidth="3.5" />
                                    <text y="5" textAnchor="middle" fontSize="14" fontWeight="700" fill={s.done ? '#ffffff' : r.color}>
                                        {s.done ? '✓' : s.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                );
            })}

            {[...ngos.values()].map((n) => {
                const {x, y} = xy(n.position);
                return (
                    <g key={n.name + x} transform={`translate(${x} ${y})`}>
                        <rect x="-17" y="-17" width="34" height="34" rx="9" fill="#159aa0" stroke="#ffffff" strokeWidth="3" />
                        <text y="6" textAnchor="middle" fontSize="16" fontWeight="700" fill="#ffffff">ע</text>
                        <text y="38" textAnchor="middle" fontSize="16" fontWeight="600" fill="#0e6d72">{n.name}</text>
                    </g>
                );
            })}

            {routes.map((r) => {
                if (!r.vehicle) return null;
                const dim = selectedId != null && r.id !== selectedId;
                const {x, y} = xy(r.vehicle.position);
                return (
                    <g key={`v${r.id}`} transform={`translate(${x} ${y})`} opacity={dim ? 0.3 : 1}
                        onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} style={{cursor: 'pointer'}}>
                        {!r.vehicle.stale && !dim && <circle className="cr-ring" r="22" fill="none" stroke={r.color} strokeWidth="3" />}
                        {r.vehicle.heading != null && (
                            <path d="M0 -31 L7 -20 L-7 -20 Z" fill={r.color} transform={`rotate(${r.vehicle.heading})`} />
                        )}
                        <circle r="19" fill={r.color} stroke="#ffffff" strokeWidth="3.5" />
                        {/* רכב קטן */}
                        <g fill="#ffffff" transform="translate(-10 -7)">
                            <rect x="0" y="3" width="13" height="9" rx="1.5" />
                            <path d="M13 6h4l3 3.5V12h-7z" />
                            <circle cx="4" cy="13.5" r="2.2" stroke={r.color} strokeWidth="1" />
                            <circle cx="16" cy="13.5" r="2.2" stroke={r.color} strokeWidth="1" />
                        </g>
                        <text y="-40" textAnchor="middle" fontSize="17" fontWeight="700" fill="#1b1b1b"
                            stroke="#ffffff" strokeWidth="4" paintOrder="stroke">{r.vehicle.name}</text>
                    </g>
                );
            })}
        </svg>
    );
}
