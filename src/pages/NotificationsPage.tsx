import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import { LoadingBlock } from '../components/PageParts';
import { useLiveUpdates, useOpenLink } from '../components/LiveUpdates';
import NotificationsDeck from '../components/notifications/NotificationsDeck';
import { toDeckNotification } from '../components/notifications/toDeckNotification';
import type { DeckDonation } from '../components/notifications/notificationUtils';
import { authHeaders, getCurrentUser } from '../utils/auth';
import type { DonationResponseDto, NotificationDto } from '../types/api';

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
  const openLink = useOpenLink();
  const { subscribe, refresh } = useLiveUpdates();
  const [raw, setRaw] = useState<NotificationDto[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [donations, setDonations] = useState<Record<number, DeckDonation>>({});
  const requested = useRef(new Set<number>());
  const role = getCurrentUser().role;

  useEffect(() => {
    fetch('/api/notifications?pageSize=100', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as NotificationDto[];
      })
      .then(setRaw)
      .catch(() => {
        setLoadError(true);
        setRaw([]);
      });
  }, []);

  // התראה חדשה בזמן שהדף פתוח - נכנסת לסוף החפיסה
  useEffect(() => subscribe((notification) => {
    setRaw((prev) => (prev
      ? [{ ...notification, isRead: false }, ...prev.filter((n) => n.id !== notification.id)]
      : prev));
  }), [subscribe]);

  const notifications = useMemo(() => (raw ?? []).map((n) => toDeckNotification(n, role)), [raw, role]);

  // פרטי התרומות של הקלפים שעוד לא נקראו (מה נתרם ולאיזו עמותה) - כל תרומה פעם אחת
  useEffect(() => {
    const ids = [...new Set(notifications.filter((n) => !n.isRead && n.donationId).map((n) => n.donationId!))]
      .filter((id) => !requested.current.has(id));
    ids.forEach((id) => {
      requested.current.add(id);
      fetch(`/api/donations/${id}`, { headers: authHeaders() })
        .then(async (res) => (res.ok ? ((await res.json()) as DonationResponseDto) : null))
        .then((d) => {
          if (d) setDonations((prev) => ({ ...prev, [id]: toDeckDonation(d) }));
        })
        .catch(() => undefined);   // בלי הפרטים הקלף מוצג בלי השורה התחתונה
    });
  }, [notifications]);

  const markRead = useCallback((id: number, isRead: boolean) => {
    // "לקודמת" מחזיר את הקלף לחפיסה רק במסך - בשרת אין "סימון כלא נקרא", ההתראה נשארת נקראה
    if (!isRead) return;
    fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ ids: [id] }),
    })
      .then(() => refresh())   // המספר בפעמון שבכותרת
      .catch(() => undefined);
  }, [refresh]);

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
