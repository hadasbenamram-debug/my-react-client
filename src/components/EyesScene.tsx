import EyesShape from './EyesShape';
import useScrollProgress from '../hooks/useScrollProgress';
import {range} from '../utils/motion';
import {EYES_SCENE} from '../data';

export default function EyesScene() {
    const [ref, progress] = useScrollProgress<HTMLElement>();
    const enter = range(progress, 0.06, 0.24);
    const gaze = Math.sin(progress * Math.PI * 4);

    return (
        <section className="scene eyes-scene" id="awareness" ref={ref}>
            <div className="scene-sticky">
                <div
                    className="eyes-stage"
                    style={{
                        opacity: enter,
                        transform: `translateY(${(1 - enter) * 26}px)`
                    }}
                >
                    <h2>{EYES_SCENE.title}</h2>
                    <EyesShape offset={gaze} />
                </div>
            </div>
        </section>
    );
}
