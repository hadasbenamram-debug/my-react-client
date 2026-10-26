import { useEffect, useState } from 'react';
import type { AccountRoleDto, MyProfileDto } from '../types/api';
import { authHeaders, getCurrentUser, getToken } from '../utils/auth';

export type AddableRole = 'Volunteer' | 'Supplier' | 'Ngo';

/**
 * תיקון 10: משתמש מחובר שפותח טופס הרשמה (מתנדב / ספק / עמותה) מוסיף את התפקיד לחשבון הקיים שלו -
 * אותו מייל ואותה סיסמה - במקום לנסות לפתוח חשבון חדש עם אותו מייל.
 * מחזיר: האם מחוברים, פרטי החשבון, והמצב של התפקיד הזה בחשבון (אם כבר קיים).
 */
export function useAddRoleMode(role: AddableRole) {
  const activeRole = String(getCurrentUser().role ?? '').toLowerCase();
  const loggedIn = !!getToken() && activeRole !== '' && activeRole !== 'guest';
  const [account, setAccount] = useState<MyProfileDto | null>(null);

  useEffect(() => {
    if (!loggedIn) return;
    let cancelled = false;
    fetch('/api/users/me', { headers: authHeaders() })
      .then((r) => (r.ok ? (r.json() as Promise<MyProfileDto>) : null))
      .then((data) => { if (!cancelled) setAccount(data); })
      .catch(() => { /* הטופס עדיין עובד - השרת בודק שוב בשליחה */ });
    return () => { cancelled = true; };
  }, [loggedIn]);

  const existing: AccountRoleDto | undefined = account?.roles?.find((r) => r.role === role);
  const blocked = !!existing || (account !== null && !account.canAddRoles);
  return { loggedIn, account, existing, blocked };
}
