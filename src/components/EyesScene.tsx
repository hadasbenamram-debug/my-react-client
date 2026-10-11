import EyesShape from './EyesShape';
import useScrollProgress from '../hooks/useScrollProgress.js';
import { range } from '../utils/motion.js';
import { EYES_SCENE } from '../data.js';

export default function EyesScene() {
    const [ref, progress] = useScrollProgress();
    const progNumber = Number(progress) || 0;
    const enter = range(progNumber, 0.06, 0.24);
    const gaze = Math.sin(progNumber * Math.PI * 4);

    return (
        <section className="scene eyes-scene" id="awareness" ref={ref as any}>
            <div className="scene-sticky">
                <div
                    className="eyes-stage"
                    style={{
                        opacity: enter,
                        transform: `translateY(${(1 - enter) * 26}px)`,
                    }}
                >
                    <h2>{EYES_SCENE.title}</h2>
                    <EyesShape offset={gaze} />
                </div>
            </div>
        </section>
    );
}