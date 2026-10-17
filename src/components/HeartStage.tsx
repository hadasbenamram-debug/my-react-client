import useSectionProgress from '../hooks/useSectionProgress';
import {range} from '../utils/motion';

/** Flat grey disc that rides up with the heart and gives it contrast over the striped page. */
interface HeartStageProps {
    /** DOM id of the section whose scroll progress drives the disc */
    watchId?: string;
}

export default function HeartStage({watchId = 'community'}: HeartStageProps) {
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
