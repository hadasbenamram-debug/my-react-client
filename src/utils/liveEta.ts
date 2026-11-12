import type {LatLng} from '../types';

// תיקון 61: חישובים קטנים לחדר הבקרה החי - מרחק, כיוון נסיעה, פענוח Polyline של Google.

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** מרחק אווירי בק"מ */
export function haversineKm(a: LatLng, b: LatLng): number {
    const dLat = rad(b.lat - a.lat);
    const dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** אורך של דרך שעוברת בכמה נקודות */
export function pathKm(points: LatLng[]): number {
    let km = 0;
    for (let i = 1; i < points.length; i++) km += haversineKm(points[i - 1], points[i]);
    return km;
}

/** כיוון הנסיעה במעלות (0 = צפון, 90 = מזרח). null כששתי הנקודות כמעט באותו מקום */
export function headingDeg(from: LatLng, to: LatLng): number | null {
    if (haversineKm(from, to) < 0.005) return null;
    const y = Math.sin(rad(to.lng - from.lng)) * Math.cos(rad(to.lat));
    const x = Math.cos(rad(from.lat)) * Math.sin(rad(to.lat)) -
        Math.sin(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.cos(rad(to.lng - from.lng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** פענוח Polyline מקודד של Google (Encoded Polyline Algorithm) */
export function decodePolyline(encoded: string): LatLng[] {
    const points: LatLng[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;
    while (index < encoded.length) {
        for (const axis of [0, 1]) {
            let shift = 0;
            let result = 0;
            let byte: number;
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20 && index < encoded.length);
            const delta = result & 1 ? ~(result >> 1) : result >> 1;
            if (axis === 0) lat += delta;
            else lng += delta;
        }
        points.push({lat: lat / 1e5, lng: lng / 1e5});
    }
    return points;
}

/** נקודה בין שתי נקודות (t בין 0 ל-1) */
export const lerpLatLng = (a: LatLng, b: LatLng, t: number): LatLng => ({
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
});
