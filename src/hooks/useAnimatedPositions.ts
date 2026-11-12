import {useEffect, useRef, useState} from 'react';
import type {LatLng} from '../types';
import {lerpLatLng} from '../utils/liveEta';

// תיקון 61: הרכבים בחדר הבקרה "נוסעים" - כשמגיע מיקום חדש, הסמן מחליק אליו מהמיקום הקודם
// במקום לקפוץ. משך ההחלקה = הזמן שעבר בין שני העדכונים (בין 1.5 ל-8 שניות), כך שכשהעדכונים
// מגיעים כל כמה שניות הרכב נראה בתנועה רציפה.

export interface AnimatedTarget {
    position: LatLng;
    /** מתי נמדד המיקום (ISO) - לחישוב משך ההחלקה */
    at: string;
}

interface Tween {
    from: LatLng;
    to: LatLng;
    start: number;
    duration: number;
    at: string;
}

const MIN_MS = 1500;
const MAX_MS = 8000;
const FRAME_MS = 33; // בערך 30 פריימים בשנייה - מספיק חלק, ולא מעמיס על המפה

const reducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function useAnimatedPositions(targets: Record<string, AnimatedTarget>): Record<string, LatLng> {
    const [shown, setShown] = useState<Record<string, LatLng>>(() =>
        Object.fromEntries(Object.entries(targets).map(([k, t]) => [k, t.position])));
    const shownRef = useRef(shown);
    const tweens = useRef<Record<string, Tween>>({});
    const frame = useRef<number | null>(null);
    const lastPaint = useRef(0);

    // מפתח שמשתנה רק כשמגיע מיקום חדש (ולא בכל רינדור)
    const signature = Object.entries(targets).map(([k, t]) => `${k}:${t.at}:${t.position.lat}:${t.position.lng}`).join('|');

    useEffect(() => {
        const now = performance.now();
        const next: Record<string, Tween> = {};
        for (const [key, target] of Object.entries(targets)) {
            const current = shownRef.current[key];
            const old = tweens.current[key];
            if (!current || reducedMotion()) {
                next[key] = {from: target.position, to: target.position, start: now, duration: 0, at: target.at};
                continue;
            }
            if (old && old.at === target.at && old.to.lat === target.position.lat && old.to.lng === target.position.lng) {
                next[key] = old;
                continue;
            }
            const gap = old ? Date.parse(target.at) - Date.parse(old.at) : MIN_MS;
            next[key] = {
                from: current,
                to: target.position,
                start: now,
                duration: Math.min(MAX_MS, Math.max(MIN_MS, Number.isFinite(gap) ? gap : MIN_MS)),
                at: target.at,
            };
        }
        tweens.current = next;

        const step = (time: number) => {
            let moving = false;
            const result: Record<string, LatLng> = {};
            for (const [key, tw] of Object.entries(tweens.current)) {
                const t = tw.duration === 0 ? 1 : Math.min(1, (time - tw.start) / tw.duration);
                if (t < 1) moving = true;
                result[key] = lerpLatLng(tw.from, tw.to, t);
            }
            if (time - lastPaint.current >= FRAME_MS || !moving) {
                lastPaint.current = time;
                shownRef.current = result;
                setShown(result);
            }
            frame.current = moving ? requestAnimationFrame(step) : null;
        };
        if (frame.current) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(step);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    useEffect(() => () => {
        if (frame.current) cancelAnimationFrame(frame.current);
    }, []);

    return shown;
}
