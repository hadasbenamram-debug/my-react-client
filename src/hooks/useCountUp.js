import {useEffect, useState} from 'react';

const easeOut = (t) => 1 - (1 - t) ** 3;

/** Ramps 0 -> target once `active` turns true. */
export default function useCountUp(target, active, duration = 1600) {
    const [value, setValue] = useState(0);

    useEffect(() => {
        if (!active) {
            return undefined;
        }

        let frame = 0;
        const start = performance.now();

        const tick = (now) => {
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
