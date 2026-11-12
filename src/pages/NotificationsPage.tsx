import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';
import { useLiveUpdates, useOpenLink } from '../components/LiveUpdates';
import { authHeaders } from '../utils/auth';
import { formatDateTime } from '../utils/format';
import type { NotificationDto } from '../types/api';

const COLORS: Record<string, string> = { success: 'success.main', warning: 'warning.main', request: 'secondary.main' };

// מרכז ההתראות: היסטוריה מהשרת (api/notifications) + התראות חדשות בזמן אמת (SignalR).
// תוקן: כתובת ה-Hub הייתה https://localhost:7295 קבועה, וה-Hub בשרת היה ריק.
// תיקון 50: החיבור ל-SignalR משותף לכל האתר (LiveUpdates) - כאן רק מאזינים לו, ומאפסים את המונה בפעמון.
export function NotificationsPage() {
  const openLink = useOpenLink();
  const { subscribe, markAllRead } = useLiveUpdates();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications?pageSize=100', { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as NotificationDto[]) : []))
      .then((list) => {
        setNotifications(list);
        // הצגת הרשימה = קריאה
        if (list.some((n) => !n.isRead)) {
          void fetch('/api/notifications/mark-read', { method: 'POST', headers: authHeaders() }).then(() => markAllRead());
        } else {
          markAllRead();
        }
      })
      .finally(() => setLoading(false));
  }, [markAllRead]);

  // התראה חדשה בזמן שהדף פתוח - נוספת לראש הרשימה (והדף פתוח = היא נקראה)
  useEffect(() => subscribe((notification) => {
    setNotifications((prev) => [notification, ...prev.filter((n) => n.id !== notification.id)]);
    void fetch('/api/notifications/mark-read', { method: 'POST', headers: authHeaders() }).then(() => markAllRead());
  }), [subscribe, markAllRead]);

  if (loading) return <LoadingBlock text="טוען התראות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="החשבון שלי" title="מרכז ההתראות" subtitle="התראות חדשות מופיעות כאן בזמן אמת." />

      {notifications.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', color: 'text.secondary' }}>
          <NotificationsNoneIcon sx={{ fontSize: 48, mb: 1, opacity: 0.6 }} />
          <Typography>אין התראות כרגע.</Typography>
        </Card>
      ) : (
        notifications.map((notif) => (
          <Card
            key={notif.id}
            sx={{
              p: 2.5,
              mb: 1.5,
              borderInlineStart: '4px solid',
              borderInlineStartColor: COLORS[notif.type] ?? 'primary.main',
              opacity: notif.isRead ? 0.85 : 1,
            }}
          >
            <Typography sx={{ fontWeight: notif.isRead ? 500 : 700, mb: 0.5 }}>{notif.subject || 'התראת מערכת'}</Typography>
            {notif.content && <Typography>{notif.content}</Typography>}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography color="text.secondary" sx={{ fontSize: '0.75rem' }}>{formatDateTime(notif.createdAt)}</Typography>
              {notif.link && notif.link.startsWith('/') && (
                <Button size="small" onClick={() => openLink(notif.link!)}>מעבר</Button>
              )}
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
