import StatCard from './StatCard';
import {STATS} from '../data';

export default function Impact() {
    return (
        <section className="impact" id="impact">
            <h2>ההשפעה שלנו בשטח</h2>
            <div className="impact-grid">
                {STATS.map((stat) => (
                    <StatCard
                        key={stat.label}
                        value={stat.value}
                        suffix={stat.suffix}
                        label={stat.label}
                    />
                ))}
            </div>
        </section>
    );
}
