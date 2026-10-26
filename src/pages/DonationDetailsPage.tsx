import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import DonationImage from '../components/DonationImage';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { authHeaders } from '../utils/auth';
import { DONATION_STATUS_LABELS, MATCH_STATUS_LABELS, formatDateTime, formatTime, formatTimeSpan } from '../utils/format';
import type { DonationResponseDto } from '../types/api';

// פרטי תרומה (?id=). תוקן: מזהה התרומה היה קבוע (1), ופרטי השיבוץ לא הגיעו מהשרת.
export function DonationDetailsPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // הגענו לכאן מיד אחרי פרסום התרומה (CreateDonationPage)
  const justPublished = (location.state as { justPublished?: boolean } | null)?.justPublished === true;
  const donationId = Number(params.get('id'));
  const [donation, setDonation] = useState<DonationResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!donationId) {
      setLoading(false);
      return;
    }
    fetch(`/api/donations/${donationId}`, { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as DonationResponseDto) : null))
      .then(setDonation)
      .catch(() => setDonation(null))
      .finally(() => setLoading(false));
  }, [donationId]);

  if (loading) return <LoadingBlock text="טוען פרטי תרומה..." />;
  if (!donation) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <EmptyState text="התרומה המבוקשת לא נמצאה." />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title={`פרטי תרומה #${donation.id}`} />

      {justPublished && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={<Button color="inherit" onClick={() => navigate('/app/supplier/create-donation')}>תרומה נוספת</Button>}
        >
          התרומה פורסמה בהצלחה! מנוע השידוכים יחפש לה מתנדב ועמותה.
        </Alert>
      )}

      <Card sx={{ p: { xs: 3, md: 4 } }}>
        {donation.image && (
          <Box sx={{ mb: 2.5 }}>
            <DonationImage image={donation.image} size="large" />
          </Box>
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography><strong>סטטוס:</strong></Typography>
          <Chip size="small" color="primary" label={DONATION_STATUS_LABELS[donation.status] ?? donation.status} />
        </Box>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>אזור:</strong> {donation.regionName ?? donation.regionId}</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>נוצרה:</strong> {formatDateTime(donation.createdAt)}</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>איסוף עד:</strong> {formatTimeSpan(donation.latestPickupTime)}</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>תוקף:</strong> {formatDateTime(donation.expirationTime)}</Typography>
        <Typography color="text.secondary"><strong>משקל כולל:</strong> {donation.totalWeightKg.toFixed(1)} ק"ג</Typography>

        <Box sx={{ mt: 2 }}>
          {donation.categories.map((c) => (
            <Chip key={c.categoryId} size="small" variant="outlined" sx={{ mr: 1, mb: 1 }}
              label={`${c.categoryName ?? 'פריט'} ×${c.quantity} (${c.weightKg} ק"ג)`} />
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 1.5 }}>שיבוץ</Typography>
        {donation.matchId ? (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>סטטוס השיבוץ:</strong> {donation.matchStatus ? MATCH_STATUS_LABELS[donation.matchStatus] : '—'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>עמותת יעד:</strong> {donation.ngoName ?? '—'}</Typography>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>מתנדב:</strong> {donation.volunteerName ?? '—'}</Typography>
            <Typography color="text.secondary"><strong>הגעה משוערת לאיסוף:</strong> {formatTime(donation.estimatedArrival)}</Typography>
            {donation.receivedAt && (
              <Typography color="text.secondary"><strong>העמותה אישרה קבלה:</strong> {formatDateTime(donation.receivedAt)}</Typography>
            )}
          </Box>
        ) : (
          <Typography color="text.secondary">התרומה עדיין לא שובצה.</Typography>
        )}
      </Card>
    </Box>
  );
}
