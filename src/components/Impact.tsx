import {useEffect, useState} from 'react';
import StatCard from './StatCard';
import {STATS} from '../data';
import type {PublicStatsDto} from '../types/api';

// תיקון 31: המספרים אמיתיים - השרת סופר אותם מהמסד (GET api/stats/public, פתוח גם לאורחים, מטמון של 5 דקות).
// עד שהנתונים מגיעים מוצג "—", ואם השרת לא זמין - "—" והודעה קטנה (במקום מספרים מומצאים).
export default function Impact() {
    const [stats, setStats] = useState<PublicStatsDto | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        fetch('/api/stats/public', {signal: controller.signal})
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.json() as Promise<PublicStatsDto>;
            })
            .then((data) => setStats(data))
            .catch(() => {
                if (!controller.signal.aborted) {
                    setFailed(true);
                }
            });

        return () => controller.abort();
    }, []);

    return (
        <section className="impact" id="impact">
            <h2>ההשפעה שלנו בשטח</h2>
            <div className="impact-grid">
                {STATS.map((stat) => (
                    <StatCard
                        key={stat.key}
                        value={stats ? stats[stat.key] : null}
                        suffix={stat.suffix}
                        label={stat.label}
                    />
                ))}
            </div>
            {failed && <p className="impact-note">לא הצלחנו לטעון כרגע את הנתונים העדכניים. נסו לרענן את הדף בעוד כמה דקות.</p>}
        </section>
    );
}
