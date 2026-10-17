import {useEffect, useRef, useState, type RefObject} from 'react';

/**
 * Progress (0..1) of a tall section travelling through the viewport,
 * measured from the moment its top reaches the top of the screen.
 */
export default function useScrollProgress<T extends HTMLElement = HTMLElement>(): [RefObject<T>, number] {
    const ref = useRef<T>(null);
    const [progress, setProgress] = useState<number>(0);

    useEffect(() => {
        const node = ref.current;
        if (!node) {
            return undefined;
        }

        let frame = 0;

        const update = () => {
            frame = 0;
            const rect = node.getBoundingClientRect();
            const distance = rect.height - window.innerHeight;
            const next = distance > 0
                ? -rect.top / distance
                : 1 - rect.top / window.innerHeight;
            setProgress(Math.min(1, Math.max(0, next)));
        };

        const onScroll = () => {
            if (!frame) {
                frame = window.requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, {passive: true});
        window.addEventListener('resize', onScroll);

        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
        };
    }, []);

    return [ref, progress];
}
