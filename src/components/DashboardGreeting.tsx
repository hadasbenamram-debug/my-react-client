import { useEffect } from 'react';
import PageTitle from './PageTitle';
import { fetchMyProfile } from '../store/accountSlice';
import { useAppDispatch, useAppSelector } from '../store';
import { selectCurrentUser, userUpdated } from '../store/authSlice';

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

interface DashboardGreetingProps {
  eyebrow: string;
}

export default function DashboardGreeting({ eyebrow }: DashboardGreetingProps) {
  const dispatch = useAppDispatch();
  const name = firstName(useAppSelector(selectCurrentUser).name);

  useEffect(() => {
    let cancelled = false;
    // הפרופיל נטען ב-thunk המשותף (store/accountSlice.ts)
    dispatch(fetchMyProfile())
      .unwrap()
      .then((data) => {
        if (cancelled || !data?.name) return;
        // נשמר ב-Redux (ומשם ב-localStorage) - בכניסה הבאה השם מופיע מיד
        dispatch(userUpdated({ name: data.name }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  const greeting = greetingForNow();
  return (
    <PageTitle
      eyebrow={eyebrow}
      title={name ? `${greeting}, ${name}` : greeting}
      subtitle="איזה כיף שבחרת לקחת חלק בעוד יום של נתינה"
    />
  );
}
