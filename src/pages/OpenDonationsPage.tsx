import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import DonationImage from '../components/DonationImage';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { useAutoRefresh } from '../components/LiveUpdates';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { DONATION_STATUS_LABELS, MATCH_STATUS_LABELS, formatDateTime, formatPickupWindow, formatTime, formatTimeSpan } from '../utils/format';
import type { DonationResponseDto, SupplierDonationSummaryDto } from '../types/api';

const OPEN_STATUSES = ['Pending', 'Matched', 'PickedUp', 'Delivered'];

const minutesOf = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// חדש: הספק עורך (כל עוד התרומה ממתינה) ומבטל (עד שנאספה) תרומות שלו.
// תוקן: הביטול שלח DELETE לנתיב שלא היה קיים.
export function OpenDonationsPage() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<SupplierDonationSummaryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [editing, setEditing] = useState<DonationResponseDto | null>(null);
  const [editPickup, setEditPickup] = useState('');
  // תיקון 43: "זמינה לאיסוף החל מ-" ('' = אפשר לאסוף מיד)
  const [editReady, setEditReady] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const fetchDonations = useCallback(() => {
    fetch('/api/donations/my-supplier-donations', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const all = (await res.json()) as SupplierDonationSummaryDto[];
        setDonations(all.filter((d) => OPEN_STATUSES.includes(d.status)));
      })
      .catch(() => setMessage({ text: 'שגיאה בטעינת התרומות.', ok: false }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  // תיקון 50: הסטטוס מתעדכן לבד (מתנדב אישר / אסף / מסר)
  useAutoRefresh(fetchDonations);

  const handleCancel = async (donationId: number) => {
    const reason = window.prompt('לבטל את התרומה? אם כבר שובץ מתנדב הוא יקבל הודעה. סיבה (לא חובה):', '');
    if (reason === null) return;

    const res = await fetch(`/api/donations/${donationId}/cancel`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ reason: reason || null }),
    });
    setMessage(res.ok ? { text: 'התרומה בוטלה.', ok: true } : { text: await readErrorMessage(res, 'לא ניתן לבטל את התרומה.'), ok: false });
    fetchDonations();
  };

  const openEdit = async (donationId: number) => {
    const res = await fetch(`/api/donations/${donationId}`, { headers: authHeaders() });
    if (!res.ok) {
      setMessage({ text: await readErrorMessage(res, 'לא ניתן לטעון את התרומה.'), ok: false });
      return;
    }
    const donation = (await res.json()) as DonationResponseDto;
    setEditing(donation);
    setEditPickup(formatTimeSpan(donation.latestPickupTime));
    setEditReady(donation.earliestPickupTime ? formatTimeSpan(donation.earliestPickupTime) : '');
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editReady && minutesOf(editReady) + 30 > minutesOf(editPickup)) {
      setEditError('השעה "זמינה לאיסוף החל מ-" צריכה להיות לפחות 30 דקות לפני שעת האיסוף האחרונה.');
      return;
    }
    setEditError(null);
    const res = await fetch(`/api/donations/${editing.id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({
        latestPickupTime: `${editPickup}:00`,
        earliestPickupTime: editReady ? `${editReady}:00` : null,
        expirationTime: editing.expirationTime,
        categories: editing.categories.map((c) => ({ categoryId: c.categoryId, quantity: c.quantity, weightKg: c.weightKg })),
      }),
    });
    if (res.ok) {
      setEditing(null);
      setMessage({ text: 'התרומה עודכנה.', ok: true });
      fetchDonations();
    } else {
      setMessage({ text: await readErrorMessage(res, 'שגיאה בעדכון התרומה.'), ok: false });
    }
  };

  const updateLine = (index: number, field: 'quantity' | 'weightKg', value: number) => {
    if (!editing) return;
    setEditing({ ...editing, categories: editing.categories.map((c, i) => (i === index ? { ...c, [field]: value } : c)) });
  };

  if (loading) return <LoadingBlock text="טוען תרומות פתוחות..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title="תרומות פתוחות" subtitle="התרומות של היום: עריכה, ביטול ומעקב." />
      {message && <Alert severity={message.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{message.text}</Alert>}

      {donations.length === 0 ? (
        <EmptyState text="אין תרומות פתוחות כרגע." />
      ) : (
        donations.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <DonationImage image={item.image} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
                  <Chip size="small" variant="outlined" color={item.status === 'Pending' ? 'warning' : 'primary'}
                    label={DONATION_STATUS_LABELS[item.status] ?? item.status} />
                </Box>
                <Typography color="text.secondary">
                  <strong>אזור:</strong> {item.regionName} · <strong>איסוף:</strong> {formatPickupWindow(item.earliestPickupTime, item.latestPickupTime)} · <strong>תוקף:</strong> {formatDateTime(item.expirationTime)}
                </Typography>
                {/* תיקון 48: מי מטפל בתרומה עכשיו */}
                {item.volunteerName && item.status !== 'Pending' && (
                  <Typography color="text.secondary">
                    <strong>מתנדב:</strong> {item.volunteerName} · <strong>עמותה:</strong> {item.ngoName ?? '—'}
                    {item.status === 'Matched' && item.estimatedArrival ? <> · <strong>איסוף בערך ב-</strong>{formatTime(item.estimatedArrival)}</> : null}
                    {item.matchStatus && item.status === 'Matched' ? <> · {MATCH_STATUS_LABELS[item.matchStatus] ?? ''}</> : null}
                  </Typography>
                )}
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button variant="text" onClick={() => navigate(`/app/supplier/donation/${item.id}`)}>פרטים</Button>
              {item.status === 'Pending' && (
                <Button variant="outlined" onClick={() => void openEdit(item.id)}>עריכה</Button>
              )}
              {(item.status === 'Pending' || item.status === 'Matched') && (
                <Button variant="outlined" color="error" onClick={() => void handleCancel(item.id)}>ביטול</Button>
              )}
            </Stack>
          </Card>
        ))
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} fullWidth maxWidth="sm">
        <DialogTitle>עריכת תרומה #{editing?.id}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="זמינה לאיסוף החל מ- (לא חובה)" type="time" value={editReady}
              onChange={(e) => setEditReady(e.target.value)} slotProps={{ inputLabel: { shrink: true } }}
              helperText="ריק = אפשר לאסוף מיד" />
            <TextField label="שעת איסוף אחרונה" type="time" value={editPickup}
              onChange={(e) => setEditPickup(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
            {editError && <Alert severity="error">{editError}</Alert>}
            {editing?.categories.map((c, i) => (
              <Stack key={c.categoryId} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Typography sx={{ minWidth: 100 }}>{c.categoryName ?? `קטגוריה ${c.categoryId}`}</Typography>
                <TextField size="small" label="כמות" type="number" value={c.quantity}
                  onChange={(e) => updateLine(i, 'quantity', Number(e.target.value))} slotProps={{ htmlInput: { min: 1 } }} />
                <TextField size="small" label='משקל (ק"ג)' type="number" value={c.weightKg}
                  onChange={(e) => updateLine(i, 'weightKg', Number(e.target.value))} slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }} />
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="error" onClick={() => setEditing(null)}>ביטול</Button>
          <Button variant="contained" onClick={() => void saveEdit()}>שמירה</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
