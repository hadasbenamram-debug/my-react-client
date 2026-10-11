import useSectionProgress from '../hooks/useSectionProgress.js';
import {range} from '../utils/motion.js';

/** Flat grey disc that rides up with the heart and gives it contrast over the striped page. */
export default function HeartStage({watchId = 'community'}) {
    const progress = useSectionProgress(watchId);
    const arrive = range(progress, -0.22, 0.04);
    const leave = range(progress, 0.34, 0.44);

    return (
        <div
            className="heart-stage"
            aria-hidden="true"
            style={{
                opacity: arrive * (1 - leave),
                transform: `translate(-50%, -50%) translateY(${(1 - arrive) * 16}vh)`
            }}
        />
    );
}
