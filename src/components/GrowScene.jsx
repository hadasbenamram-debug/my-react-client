import {useEffect} from 'react';
import SceneCaption from './SceneCaption.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import {range} from '../utils/motion.js';

/** Shape grows from a dot until it floods the viewport, then hands over to the caption. */
export default function GrowScene({id, variant, maxScale, beat, darkFlood, title, text, children}) {
    const [ref, progress] = useScrollProgress();
    const grow = range(progress, 0.04, 0.3);
    const flood = range(progress, 0.34, 0.55);
    const drain = range(progress, 0.58, 0.7);
    const reveal = range(progress, 0.66, 0.82);
    const scale = (0.06 + grow * 0.94) * (1 + flood * (maxScale - 1));
    const floodOpacity = range(flood, 0.3, 0.85) * (1 - drain);
    const overDark = Boolean(darkFlood) && floodOpacity > 0.45;

    useEffect(() => {
        document.body.classList.toggle('on-dark-scene', overDark);
        return () => document.body.classList.remove('on-dark-scene');
    }, [overDark]);

    return (
        <section className={`scene scene--${variant}`} id={id} ref={ref}>
            <div className="scene-sticky">
                <div
                    className={`scene-shape${beat && grow > 0.97 && flood < 0.02 ? ' is-beating' : ''}`}
                    style={{transform: `scale(${scale})`, opacity: 1 - drain}}
                >
                    {children}
                </div>
                <span
                    className="scene-flood"
                    aria-hidden="true"
                    style={{opacity: floodOpacity}}
                />
                <SceneCaption title={title} text={text} progress={reveal} />
            </div>
        </section>
    );
}
