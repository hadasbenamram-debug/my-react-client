import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { fetchMyProfile } from '../store/accountSlice';
import { NotFoundPage } from '../pages/NotFoundPage';
import { otherRoleForPath, roleForPath, switchRole, syncRoles } from '../utils/auth';
import { useAppDispatch, useAppSelector } from '../store';
import { selectCurrentUser } from '../store/authSlice';

interface RoleFallbackProps {
  /** מסך הבית של התפקיד הפעיל */
  home: string;
}

/**
 * תיקון 10: כתובת שלא קיימת בתפקיד הפעיל. אם היא שייכת לתפקיד אחר של אותו חשבון (למשל ספק שהוא גם מתנדב
 * ולחץ על התראה "בקשת איסוף חדשה") - עוברים לתפקיד ההוא ונכנסים בדיוק לאותו מסך. מסך של תפקיד אחר שאין לחשבון -
 * למסך הבית של התפקיד. כתובת שלא קיימת בכלל - עמוד 404.
 */
export default function RoleFallback({ home }: RoleFallbackProps) {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const target = location.pathname + location.search + location.hash;
  const pathRole = roleForPath(location.pathname);
  const activeRole = String(useAppSelector(selectCurrentUser).role ?? '').toLowerCase();
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
    dispatch(fetchMyProfile())
      .unwrap()
      .then((me) => { syncRoles(me.roles.filter((r) => r.status === 'Approved').map((r) => r.role)); })
      .catch(() => { /* נשארים עם הרשימה הקיימת */ })
      .finally(() => { if (!cancelled) setRefreshed(true); });
    return () => { cancelled = true; };
  }, [otherRole, target, mayBeNewRole, refreshed, dispatch]);

  if (otherRole || (mayBeNewRole && !refreshed)) return null;
  // כתובת שלא שייכת לאף תפקיד - עמוד 404 (עם כפתור חזרה למסך הבית של התפקיד)
  if (!pathRole) return <NotFoundPage homePath={home} />;
  // מסך של תפקיד שאין לחשבון - חזרה למסך הבית
  return <Navigate to={home} replace />;
}
