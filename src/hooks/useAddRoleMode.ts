import { useEffect } from 'react';
import type { AccountRoleDto, MyProfileDto } from '../types/api';
import { useAppDispatch, useAppSelector } from '../store';
import { selectActiveRole, selectIsLoggedIn } from '../store/authSlice';
import { fetchMyProfile, selectMyProfile } from '../store/accountSlice';

export type AddableRole = 'Volunteer' | 'Supplier' | 'Ngo';

/**
 * תיקון 10: משתמש מחובר שפותח טופס הרשמה (מתנדב / ספק / עמותה) מוסיף את התפקיד לחשבון הקיים שלו -
 * אותו מייל ואותה סיסמה - במקום לנסות לפתוח חשבון חדש עם אותו מייל.
 * מחזיר: האם מחוברים, פרטי החשבון, והמצב של התפקיד הזה בחשבון (אם כבר קיים).
 */
export function useAddRoleMode(role: AddableRole) {
  const dispatch = useAppDispatch();
  const activeRole = useAppSelector(selectActiveRole);
  const loggedIn = useAppSelector(selectIsLoggedIn);
  // הפרופיל מה-store (thunk משותף - store/accountSlice.ts)
  const profile = useAppSelector(selectMyProfile);
  const account: MyProfileDto | null = loggedIn ? profile : null;

  useEffect(() => {
    if (!loggedIn) return;
    // בכישלון הטופס עדיין עובד - השרת בודק שוב בשליחה
    void dispatch(fetchMyProfile());
  }, [loggedIn, dispatch]);

  const existing: AccountRoleDto | undefined = account?.roles?.find((r) => r.role === role);
  const blocked = !!existing || (account !== null && !account.canAddRoles);
  return { loggedIn, account, existing, blocked };
}
