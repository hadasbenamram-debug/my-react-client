import useCountUp from '../hooks/useCountUp.js';
import useInView from '../hooks/useInView.js';

export default function StatCard({value, suffix, label}) {
    const [ref, inView] = useInView();
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
