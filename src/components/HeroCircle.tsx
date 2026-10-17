import useSectionProgress from '../hooks/useSectionProgress';
import {range} from '../utils/motion';

/** Teal disc pinned to the viewport; hands over to the map as it slides in. */
interface HeroCircleProps {
    /** DOM id of the section whose scroll progress drives the fade */
    watchId?: string;
}

export default function HeroCircle({watchId = 'map'}: HeroCircleProps) {
    const progress = useSectionProgress(watchId);
    const fade = range(progress, -0.35, -0.05);

    return <div className="hero-circle" style={{opacity: 1 - fade}} aria-hidden="true" />;
}
