import {useEffect, useState} from 'react';

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** Ramps 0 -> target once `active` turns true. */
export default function useCountUp(target: number, active: boolean, duration = 1600): number {
    const [value, setValue] = useState<number>(0);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        let frame = 0;
        const start = performance.now();

        const tick = (now: DOMHighResTimeStamp) => {
            const elapsed = Math.min(1, (now - start) / duration);
            setValue(Math.round(target * easeOut(elapsed)));
            if (elapsed < 1) {
                frame = requestAnimationFrame(tick);
            }
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [active, target, duration]);

    return value;
}
