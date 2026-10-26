import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { MyProfileDto } from '../types/api';
import { authHeaders, getCurrentUser, otherRoleForPath, roleForPath, switchRole, syncRoles } from '../utils/auth';

/**
 * תיקון 10: כתובת שלא קיימת בתפקיד הפעיל. אם היא שייכת לתפקיד אחר של אותו חשבון (למשל ספק שהוא גם מתנדב
 * ולחץ על התראה "בקשת איסוף חדשה") - עוברים לתפקיד ההוא ונכנסים בדיוק לאותו מסך. אחרת - למסך הבית של התפקיד.
 */
export default function RoleFallback({ home }: { home: string }) {
  const location = useLocation();
  const target = location.pathname + location.search + location.hash;
  const pathRole = roleForPath(location.pathname);
  const activeRole = String(getCurrentUser().role ?? '').toLowerCase();
  // מסך של תפקיד אחר שעוד לא מופיע ברשימה - אולי המנהל אישר אותו אחרי הכניסה, אז שואלים את השרת פעם אחת
  const mayBeNewRole = !!pathRole && pathRole.toLowerCase() !== activeRole;
  const [refreshed, setRefreshed] = useState(false);
  const otherRole = otherRoleForPath(location.pathname);

  useEffect(() => {
    if (otherRole) {
      switchRole(otherRole, target);
      return;
    }
    if (!mayBeNewRole || refreshed) return;

    let cancelled = false;
    fetch('/api/users/me', { headers: authHeaders() })
      .then((r) => (r.ok ? (r.json() as Promise<MyProfileDto>) : null))
      .then((me) => { if (me) syncRoles(me.roles.filter((r) => r.status === 'Approved').map((r) => r.role)); })
      .catch(() => { /* נשארים עם הרשימה הקיימת */ })
      .finally(() => { if (!cancelled) setRefreshed(true); });
    return () => { cancelled = true; };
  }, [otherRole, target, mayBeNewRole, refreshed]);

  if (otherRole || (mayBeNewRole && !refreshed)) return null;
  return <Navigate to={home} replace />;
}
