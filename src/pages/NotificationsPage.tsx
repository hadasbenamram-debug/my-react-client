import { useCallback, useEffect, useMemo, useRef } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { LoadingBlock } from '../components/PageParts';
import { useLiveUpdates, useOpenLink } from '../components/LiveUpdates';
import NotificationsDeck from '../components/notifications/NotificationsDeck';
import { toDeckNotification } from '../components/notifications/toDeckNotification';
import type { DeckDonation } from '../components/notifications/notificationUtils';
import {
  fetchNotificationDonation,
  fetchNotifications,
  markNotificationsRead,
  notificationPushed,
  selectNotificationDonations,
  selectNotifications,
  selectNotificationsStatus,
} from '../store/notificationsSlice';
import { useAppDispatch, useAppSelector } from '../store';
import { selectCurrentUser } from '../store/authSlice';
import type { DonationResponseDto } from '../types/api';

// מרכז ההתראות: היסטוריה מהשרת (api/notifications) + התראות חדשות בזמן אמת (SignalR).
// תיקון 50: החיבור ל-SignalR משותף לכל האתר (LiveUpdates) - כאן רק מאזינים לו.
// תיקון 72: עיצוב "חפיסה" - עוברים על ההתראות החדשות אחת-אחת, וכל אחת מסומנת כנקראה כשעוברים ממנה
//   (במקום לסמן את כולן ברגע שנכנסים לדף). מה שנקרא יורד לרשימה שמתחת.

const kg = (value: number) => `${Math.round(value * 10) / 10} ק"ג`;

/** "לחם ×3 · ירקות ×2 · 12.5 ק"ג" + שם העמותה - לתחתית הקלף */
const toDeckDonation = (d: DonationResponseDto): DeckDonation => {
  const items = (d.categories ?? []).map((c) => `${c.categoryName ?? 'פריט'} ×${c.quantity}`).join(' · ');
  return {
    items: items ? `${items} · ${kg(d.totalWeightKg)}` : kg(d.totalWeightKg),
    ngo: d.ngoName,
  };
};

export function NotificationsPage() {
  const dispatch = useAppDispatch();
  const openLink = useOpenLink();
  const { subscribe, refresh } = useLiveUpdates();
  const raw = useAppSelector(selectNotifications);
  const loadError = useAppSelector(selectNotificationsStatus) === 'failed';
  const donationDetails = useAppSelector(selectNotificationDonations);
  const requested = useRef(new Set<number>());
  const role = useAppSelector(selectCurrentUser).role;

  // ההיסטוריה מהשרת - ב-thunk (store/notificationsSlice.ts)
  useEffect(() => {
    void dispatch(fetchNotifications());
  }, [dispatch]);

  // התראה חדשה בזמן שהדף פתוח - נכנסת לסוף החפיסה
  useEffect(() => subscribe((notification) => {
    dispatch(notificationPushed(notification));
  }), [subscribe, dispatch]);

  const notifications = useMemo(() => (raw ?? []).map((n) => toDeckNotification(n, role)), [raw, role]);

  // פרטי התרומות של הקלפים שעוד לא נקראו (מה נתרם ולאיזו עמותה) - כל תרומה פעם אחת
  useEffect(() => {
    const ids = [...new Set(notifications.filter((n) => !n.isRead && n.donationId).map((n) => n.donationId!))]
      .filter((id) => !requested.current.has(id));
    ids.forEach((id) => {
      requested.current.add(id);
      // בלי הפרטים הקלף מוצג בלי השורה התחתונה (כישלון לא מוצג)
      void dispatch(fetchNotificationDonation(id));
    });
  }, [notifications, dispatch]);

  const donations = useMemo(() => {
    const result: Record<number, DeckDonation> = {};
    Object.entries(donationDetails).forEach(([id, d]) => { result[Number(id)] = toDeckDonation(d); });
    return result;
  }, [donationDetails]);

  const markRead = useCallback((id: number, isRead: boolean) => {
    // "לקודמת" מחזיר את הקלף לחפיסה רק במסך - בשרת אין "סימון כלא נקרא", ההתראה נשארת נקראה
    if (!isRead) return;
    void dispatch(markNotificationsRead([id]))
      .then(() => refresh());   // המספר בפעמון שבכותרת
  }, [dispatch, refresh]);

  // לחיצה על כפתור בקלף: ההתראה נחשבת נקראה, ועוברים למסך (גם של תפקיד אחר של החשבון)
  const open = useCallback((to: string, notificationId?: number) => {
    if (notificationId != null && raw?.some((n) => n.id === notificationId && !n.isRead)) markRead(notificationId, true);
    openLink(to);
  }, [raw, markRead, openLink]);

  if (raw === null) return <LoadingBlock text="טוען התראות..." />;

  return (
    <Box>
      {loadError && (
        <Alert severity="warning" sx={{ maxWidth: 720, mx: 'auto', mb: 2 }}>
          לא הצלחנו לטעון את ההתראות. התראות חדשות עדיין יופיעו כאן בזמן אמת.
        </Alert>
      )}
      <NotificationsDeck notifications={notifications} donations={donations} onMarkRead={markRead} onOpen={open} />
    </Box>
  );
}
