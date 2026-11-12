import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { AdminVolunteerListItemDto } from '../types/api';
import { authHeaders } from '../utils/auth';
import { formatDateTime, isDateBeforeToday } from '../utils/format';

// תיקון 62: הדף "ניהול מתנדבים" (VolunteersPage) אוחד לכאן - אותה רשימה מאותו שרת (/api/volunteers),
// אז נשאר דף אחד: חיפוש + כל הפרטים (סטטוס אישור, זמינות, רכב, קיבולת, אמינות ותוקף רישיון).
const STATUS_LABELS: Record<string, string> = { Pending: 'ממתין לאישור', Approved: 'מאושר', Rejected: 'נדחה' };

// אותו כלל כמו בשרת (DriverLicensePolicy): תאריך תוקף שעבר, או שלא הוזן - המתנדב לא ישובץ
const licenseExpired = (v: AdminVolunteerListItemDto) => isDateBeforeToday(v.driverLicenseExpiry);
const licenseMissing = (v: AdminVolunteerListItemDto) => !v.driverLicenseExpiry;

// תיקון 63: גם לשונית בעמוד "משתמשים" (AdminPeoplePage) - אז בלי כותרת משלו
export function AdminVolunteersDirectoryPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [volunteers, setVolunteers] = useState<AdminVolunteerListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('/api/volunteers', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאת שרת: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) setVolunteers(data as AdminVolunteerListItemDto[]);
      })
      .catch((err) => {
        console.error('שגיאה בטעינת מתנדבים:', err);
        setError('שגיאה בטעינת המתנדבים.');
      })
      .finally(() => setLoading(false));
  }, []);

  const term = searchTerm.trim().toLowerCase();
  const filteredVolunteers = volunteers.filter((v) =>
    !term ||
    (v.name && v.name.toLowerCase().includes(term)) ||
    (v.phone && v.phone.includes(term)) ||
    (v.email && v.email.toLowerCase().includes(term))
  );

  if (loading) return <LoadingBlock text="טוען נתוני מתנדבים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: embedded ? 0 : 2 }}>
      {!embedded && (
        <PageTitle eyebrow="ניהול מערכת" title="ספריית מתנדבים"
          subtitle="כל המתנדבים במקום אחד: חיפוש, סטטוס האישור, תוקף הרישיון וציון האמינות." />
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={() => navigate('/app/register-volunteer')}>רישום מתנדב חדש</Button>
        <Button variant="outlined" onClick={() => navigate('/app/admin/approvals')}>בקשות ממתינות לאישור</Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="חיפוש לפי שם, טלפון או אימייל..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {filteredVolunteers.length === 0 ? (
        <EmptyState text={volunteers.length === 0 ? 'אין מתנדבים רשומים.' : 'לא נמצאו מתנדבים התואמים את החיפוש.'} />
      ) : (
        filteredVolunteers.map((v) => (
          <Card key={v.id || v.userId} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
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
              <strong>רישיון:</strong> {v.driverLicenseNumber} · <strong>בתוקף עד:</strong> {v.driverLicenseExpiry ? formatDateTime(v.driverLicenseExpiry).split(/[,\s]/)[0] : 'לא הוזן'}
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}