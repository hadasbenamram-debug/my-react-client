import useCountUp from '../hooks/useCountUp';
import useInView from '../hooks/useInView';

interface StatCardProps {
    /** null = הנתון עוד לא הגיע מהשרת (או שלא ניתן לטעון אותו) - מוצג "—" */
    value: number | null;
    suffix?: string;
    label: string;
}

export default function StatCard({value, suffix, label}: StatCardProps) {
    const [ref, inView] = useInView<HTMLElement>();
    const shown = useCountUp(value ?? 0, inView && value !== null);

    return (
        <article className="stat-card" ref={ref} aria-busy={value === null}>
            <p className="stat-value">
                {value === null ? '—' : shown.toLocaleString('en-US')}
                {value !== null && suffix}
            </p>
            <p className="stat-label">{label}</p>
        </article>
    );
}
