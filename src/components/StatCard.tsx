import useCountUp from '../hooks/useCountUp.js';
import useInView from '../hooks/useInView.js';
import React from 'react';

interface StatCardProps {
    value: number;
    suffix?: string;
    label: string;
}

export default function StatCard({ value, suffix, label }: StatCardProps) {
    const [ref, inView] = useInView();
    const shown = useCountUp(value, inView);

    return (
        <article className="stat-card" ref={ref as any}>
            <p className="stat-value">
                {(Number(shown) || 0).toLocaleString('en-US')}
                {suffix}
            </p>
            <p className="stat-label">{label}</p>
        </article>
    );
}