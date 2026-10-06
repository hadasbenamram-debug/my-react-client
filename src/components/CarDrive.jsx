import CarShape from './CarShape.jsx';
import SceneCaption from './SceneCaption.jsx';
import useScrollProgress from '../hooks/useScrollProgress.js';
import {range} from '../utils/motion.js';
import {SCENES} from '../data.js';

export default function CarDrive() {
    const [ref, progress] = useScrollProgress();
    const drive = range(progress, 0.06, 0.5);
    const exit = range(progress, 0.5, 0.58);
    const reveal = range(progress, 0.62, 0.8);

    return (
        <section className="scene car-scene" ref={ref}>
            <div className="scene-sticky">
                <span className="car-road" aria-hidden="true" style={{opacity: 0.25 * (1 - exit)}} />
                <div
                    className="car-holder"
                    style={{
                        transform: `translateX(${65 - drive * 150}vw) translateY(-43%)`,
                        opacity: 1 - exit,
                        '--spin': `${drive * 1440}deg`
                    }}
                >
                    <CarShape />
                </div>
                <SceneCaption title={SCENES.car.title} text={SCENES.car.text} progress={reveal} />
            </div>
        </section>
    );
}
