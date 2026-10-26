import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';
import { authHeaders } from '../utils/auth';
import { formatDateTime, isDateBeforeToday } from '../utils/format';
import type { AdminVolunteerListItemDto } from '../types/api';

const STATUS_LABELS: Record<string, string> = { Pending: 'ממתין לאישור', Approved: 'מאושר', Rejected: 'נדחה' };

// ניהול מתנדבים (מנהל).
// תוקן: טופס "הוספת מתנדב" שלח POST api/volunteers - שיוצר פרופיל מתנדב למשתמש המחובר (כלומר למנהל עצמו),
// בלי תוקף רישיון ובלי בדיקת ת"ז. מתנדב חדש נרשם דרך טופס ההרשמה, ומאושר בעמוד האישורים.
export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<AdminVolunteerListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/volunteers', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
        setVolunteers((await res.json()) as AdminVolunteerListItemDto[]);
      })
      .catch(() => setError('שגיאה בטעינת המתנדבים.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock text="טוען מתנדבים..." />;

  // אותו כלל כמו בשרת (DriverLicensePolicy): תאריך תוקף שעבר, או שלא הוזן - המתנדב לא ישובץ
  const licenseExpired = (v: AdminVolunteerListItemDto) => isDateBeforeToday(v.driverLicenseExpiry);
  const licenseMissing = (v: AdminVolunteerListItemDto) => !v.driverLicenseExpiry;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle eyebrow="ניהול מערכת" title="ניהול מתנדבים" subtitle="כל המתנדבים, סטטוס האישור, תוקף הרישיון וציון האמינות." />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <Button variant="contained" href="/app/register-volunteer">רישום מתנדב חדש</Button>
        <Button variant="outlined" href="/app/admin/approvals">בקשות ממתינות לאישור</Button>
      </Box>

      {volunteers.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">אין מתנדבים רשומים.</Typography>
        </Card>
      ) : (
        volunteers.map((v) => (
          <Card key={v.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{v.name || `מתנדב #${v.id}`}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size="small" variant="outlined" color={v.status === 'Approved' ? 'success' : v.status === 'Rejected' ? 'error' : 'warning'}
                  label={STATUS_LABELS[v.status] ?? v.status} />
                <Chip size="small" label={v.isAvailable ? 'זמין' : 'לא זמין'} color={v.isAvailable ? 'primary' : 'default'} />
                {licenseExpired(v) && <Chip size="small" color="error" label="רישיון לא בתוקף - לא ישובץ" />}
                {licenseMissing(v) && <Chip size="small" color="error" variant="outlined" label="תוקף רישיון לא הוזן - לא ישובץ" />}
              </Box>
            </Box>
            <Typography color="text.secondary"><strong>טלפון:</strong> {v.phone || '—'} · <strong>אימייל:</strong> {v.email || '—'}</Typography>
            <Typography color="text.secondary">
              <strong>רכב:</strong> {v.vehicleType} · <strong>קיבולת:</strong> {v.maxCapacityKg} ק"ג · <strong>אמינות:</strong> {v.reliabilityScore.toFixed(2)} / 5
            </Typography>
            <Typography color="text.secondary">
              <strong>רישיון:</strong> {v.driverLicenseNumber} · <strong>בתוקף עד:</strong> {v.driverLicenseExpiry ? formatDateTime(v.driverLicenseExpiry).split(' ')[0] : 'לא הוזן'}
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}
