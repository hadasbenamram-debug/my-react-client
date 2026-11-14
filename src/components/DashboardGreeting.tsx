import { useEffect, useState } from 'react';
import PageTitle from './PageTitle';
import { authHeaders, getCurrentUser } from '../utils/auth';

// תיקון 70: כותרת אישית לדשבורדים (עמותה, מתנדב, ספק) - "בוקר טוב, הדס" במקום "הדשבורד שלי".
// השם נלקח מהפרופיל (api/users/me) ונשמר ב-currentUser, כדי שבכניסה הבאה יופיע מיד.

/** לפי שעון ישראל - גם כשהמחשב מכוון לאזור זמן אחר */
function greetingForNow(): string {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    hourCycle: 'h23',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date()));
  if (hour >= 5 && hour < 12) return 'בוקר טוב';
  if (hour >= 12 && hour < 17) return 'צהריים טובים';
  return 'ערב טוב';
}

const firstName = (name: unknown): string =>
  typeof name === 'string' ? name.trim().split(/\s+/)[0] ?? '' : '';

export default function DashboardGreeting({ eyebrow }: { eyebrow: string }) {
  const [name, setName] = useState(() => firstName(getCurrentUser().name));

  useEffect(() => {
    let cancelled = false;
    fetch('/api/users/me', { headers: authHeaders() })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { name?: string } | null) => {
        if (cancelled || !data?.name) return;
        setName(firstName(data.name));
        try {
          localStorage.setItem('currentUser', JSON.stringify({ ...getCurrentUser(), name: data.name }));
        } catch {
          // אין גישה ל-localStorage - השם פשוט ייטען שוב בפעם הבאה
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const greeting = greetingForNow();
  return (
    <PageTitle
      eyebrow={eyebrow}
      title={name ? `${greeting}, ${name}` : greeting}
      subtitle="איזה כיף שבחרת לקחת חלק בעוד יום של נתינה"
    />
  );
}
