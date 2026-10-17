import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { formatDateTime, formatTime, MATCH_STATUS_LABELS } from '../utils/format';
import type { MatchResponseDto } from '../types/api';

// No-Show: שיבוצים שאושרו ועוד לא נאספו (אפשר לסמן No-Show -> שיבוץ מחדש מיידי וציון האמינות יורד),
// והיסטוריית אירועי No-Show. תוקן: הסינון היה לפי סטטוס 6 (Declined) במקום 7 (NoShow).
export function AdminNoShowPage() {
  const [overdue, setOverdue] = useState<MatchResponseDto[]>([]);
  const [noShows, setNoShows] = useState<MatchResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    try {
      const [activeRes, noShowRes] = await Promise.all([
        fetch('/api/matches/active', { headers: authHeaders() }),
        fetch('/api/matches?status=NoShow&pageSize=100', { headers: authHeaders() }),
      ]);
      const active = activeRes.ok ? ((await activeRes.json()) as MatchResponseDto[]) : [];
      // מאושרים שעוד לא נאספו - מועמדים ל-No-Show (המאוחרים ביותר קודם)
      setOverdue(active
        .filter((m) => (m.statusName === 'Confirmed' || m.statusName === 'InPickup') && !m.pickedUpAt)
        .sort((a, b) => (a.estimatedArrival ?? '').localeCompare(b.estimatedArrival ?? '')));
      setNoShows(noShowRes.ok ? ((await noShowRes.json()) as MatchResponseDto[]) : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const markNoShow = async (match: MatchResponseDto) => {
    const reason = window.prompt(`לסמן No-Show למתנדב ${match.volunteerName ?? ''}? סיבה (לא חובה):`, '');
    if (reason === null) return;
    const res = await fetch(`/api/matches/${match.id}/no-show`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ reason }),
    });
    setMessage(res.ok
      ? { text: 'סומן No-Show. התרומות הועברו לשיבוץ מחדש.', ok: true }
      : { text: await readErrorMessage(res, 'הפעולה נכשלה.'), ok: false });
    await load();
  };

  const reassign = async (donationId: number) => {
    const res = await fetch(`/api/matches/assign-donation/${donationId}`, { method: 'POST', headers: authHeaders() });
    const body = (await res.json().catch(() => null)) as { matched?: boolean; message?: string } | null;
    setMessage({ text: body?.message ?? (res.ok ? 'בוצע.' : 'הפעולה נכשלה.'), ok: res.ok && body?.matched === true });
    await load();
  };

  if (loading) return <LoadingBlock text="טוען נתוני No-Show..." />;

  const card = (item: MatchResponseDto, action: JSX.Element) => (
    <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
      justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
      <Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.donationId}</Typography>
          <Chip size="small" label={MATCH_STATUS_LABELS[item.statusName] ?? item.statusName} />
        </Box>
        <Typography color="text.secondary"><strong>מתנדב:</strong> {item.volunteerName ?? `#${item.volunteerId}`}</Typography>
        <Typography color="text.secondary"><strong>איסוף:</strong> {item.supplierName ?? '—'} · הגעה משוערת {formatTime(item.estimatedArrival)}</Typography>
        <Typography color="text.secondary"><strong>שובץ:</strong> {formatDateTime(item.createdAt)}</Typography>
      </Box>
      {action}
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="טיפול ב-No-Show"
        subtitle="שיבוצים שאושרו ולא נאספו, והיסטוריית אירועי No-Show. סימון No-Show מעביר את התרומה לשיבוץ מחדש מיידי."
      />
      {message && <Alert severity={message.ok ? 'success' : 'warning'} sx={{ mb: 2 }}>{message.text}</Alert>}

      <Typography variant="h6" sx={{ mb: 1.5 }}>ממתינים לאיסוף</Typography>
      {overdue.length === 0
        ? <EmptyState text="אין שיבוצים מאושרים שממתינים לאיסוף." />
        : overdue.map((m) => card(m,
          <Button variant="contained" color="error" onClick={() => void markNoShow(m)}>סמן No-Show</Button>))}

      <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>אירועי No-Show</Typography>
      {noShows.length === 0
        ? <EmptyState text="אין אירועי No-Show." />
        : noShows.map((m) => card(m,
          <Button variant="outlined" onClick={() => void reassign(m.donationId)}>נסה לשבץ שוב עכשיו</Button>))}
    </Box>
  );
}
