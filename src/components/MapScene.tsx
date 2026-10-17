import MapShape from './MapShape';
import MapRoutes from './MapRoutes';
import useScrollProgress from '../hooks/useScrollProgress';
import {range} from '../utils/motion';
import type {CSSVarStyle} from '../types';

export default function MapScene() {
    const [ref, progress] = useScrollProgress<HTMLElement>();
    const enter = range(progress, 0.04, 0.2);
    const reveal = range(progress, 0.12, 0.4);
    const draw = range(progress, 0.2, 0.66);
    const leave = range(progress, 0.88, 1);

    return (
        <section className="scene map-scene" id="map" ref={ref}>
            <div className="scene-sticky">
                <div
                    className="map-stage"
                    style={{
                        opacity: enter * (1 - leave),
                        transform: `translateY(${(1 - enter) * 26}px)`
                    }}
                >
                    <svg
                        className="map-svg"
                        viewBox="0 0 180 420"
                        role="img"
                        aria-label="מפת ישראל עם יעדי איסוף וחלוקה"
                    >
                        <MapShape reveal={reveal} />
                        <MapRoutes draw={draw} travel={progress * 1.8} />
                    </svg>

                    <div
                        className="map-message"
                        aria-label="מחברים, משנעים, מצילים"
                        style={{
                            '--message-play-state': progress > 0.035 ? 'running' : 'paused'
                        } as CSSVarStyle}
                    >
                        <span>מחברים.</span>
                        <span>משנעים.</span>
                        <span>מצילים.</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
