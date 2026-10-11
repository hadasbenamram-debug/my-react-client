import { useEffect } from 'react';
import SceneCaption from './SceneCaption';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { range } from '../utils/motion.js';

interface GrowSceneProps {
    id?: string;
    variant?: string;
    maxScale: number;
    minScale?: number;
    beat?: boolean;
    darkFlood?: boolean;
    title: string;
    text?: string;
    children?: React.ReactNode;
}

/** Shape grows from a dot until it floods the viewport, then hands over to the caption. */
export default function GrowScene({
    id,
    variant,
    maxScale,
    minScale = 0.06,
    beat,
    darkFlood,
    title,
    text,
    children
}: GrowSceneProps) {
    const [ref, progress] = useScrollProgress();
    const grow = range(progress, 0.04, 0.3);
    const flood = range(progress, 0.34, 0.55);
    // Dark floods stay in place and the caption appears on top of them (light text),
    // so there is never an empty dark screen while scrolling.
    const drain = darkFlood ? range(progress, 0.9, 0.97) : range(progress, 0.58, 0.7);
    const reveal = darkFlood ? range(progress, 0.56, 0.7) : range(progress, 0.66, 0.82);
    const scale = (minScale + grow * (1 - minScale)) * (1 + flood * (maxScale - 1));
    const floodOpacity = range(flood, 0.3, 0.85) * (1 - drain);
    const shapeDrain = darkFlood ? range(progress, 0.5, 0.58) : drain;
    const overDark = Boolean(darkFlood) && floodOpacity > 0.45;
    const captionTone = overDark ? 'light' : 'dark';

    useEffect(() => {
        document.body.classList.toggle('on-dark-scene', overDark);
        return () => document.body.classList.remove('on-dark-scene');
    }, [overDark]);

    return (
        <section className={`scene scene--${variant}`} id={id} ref={ref as any}>
            <div className="scene-sticky">
                <div
                    className={`scene-shape${beat && grow > 0.97 && flood < 0.02 ? ' is-beating' : ''}`}
                    style={{ transform: `scale(${scale})`, opacity: 1 - shapeDrain }}
                >
                    {children}
                </div>
                <span
                    className="scene-flood"
                    aria-hidden="true"
                    style={{ opacity: floodOpacity }}
                />
                <SceneCaption title={title} text={text} progress={reveal} tone={captionTone as any} />
            </div>
        </section>
    );
}