import useSectionProgress from '../hooks/useSectionProgress.js';
import {range} from '../utils/motion.js';

/** Teal disc pinned to the viewport; hands over to the map as it slides in. */
export default function HeroCircle({watchId = 'map'}) {
    const progress = useSectionProgress(watchId);
    const fade = range(progress, -0.35, -0.05);

    return <div className="hero-circle" style={{opacity: 1 - fade}} aria-hidden="true" />;
}
