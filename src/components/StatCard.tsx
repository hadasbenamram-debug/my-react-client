import useCountUp from '../hooks/useCountUp';
import useInView from '../hooks/useInView';

interface StatCardProps {
    value: number;
    suffix?: string;
    label: string;
}

export default function StatCard({value, suffix, label}: StatCardProps) {
    const [ref, inView] = useInView<HTMLElement>();
    const shown = useCountUp(value, inView);

    return (
        <article className="stat-card" ref={ref}>
            <p className="stat-value">
                {shown.toLocaleString('en-US')}
                {suffix}
            </p>
            <p className="stat-label">{label}</p>
        </article>
    );
}
