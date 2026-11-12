import {useEffect, useRef, useState} from 'react';
import StatCard from './StatCard';
import {STATS} from '../data';
import type {PublicStatsDto} from '../types/api';
import useHeaderOverScene from '../hooks/useHeaderOverScene';

// תיקון 31: המספרים אמיתיים - השרת סופר אותם מהמסד (GET api/stats/public, פתוח גם לאורחים, מטמון של 5 דקות).
// עד שהנתונים מגיעים מוצג "—", ואם השרת לא זמין - "—" והודעה קטנה (במקום מספרים מומצאים).
// תיקון 56: עיצוב חדש - רקע טורקיז בהיר, "כיפה" לבנה גדולה, הנתונים ככפתורים מעוגלים (pills),
// ועיגול טורקיז בתחתית הכיפה. מתחת לכיפה מתחילות הקשתות של העיגול הגדול באזור "מצטרפים לקהילה" (JoinSection).
export default function Impact() {
    const [stats, setStats] = useState<PublicStatsDto | null>(null);
    const [failed, setFailed] = useState(false);
    const ref = useRef<HTMLElement>(null);

    useHeaderOverScene(ref, 'on-sky-impact');

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
        <section className="impact" id="impact" ref={ref}>
            <div className="impact-dome" aria-hidden="true" />

            <div className="impact-content">
                <h2>ההשפעה שלנו בשטח</h2>
                <p className="impact-intro">
                    מאחורי כל מספר כאן יש ארוחה שהגיעה לשולחן - ולא לפח.
                    <br />
                    המספרים נספרים ישירות מהמערכת ומתעדכנים כל הזמן.
                    <br />
                    <strong>זכרו!</strong> גם ארגז ירקות אחד שמגיע בזמן הוא הצלה של ממש.
                </p>
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
            </div>

            <span className="impact-ball" aria-hidden="true" />
        </section>
    );
}
