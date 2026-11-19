import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ScaleIcon from '@mui/icons-material/Scale';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import DashboardGreeting from '../components/DashboardGreeting';
import StatGrid from '../components/StatGrid';
import DonationImage from '../components/DonationImage';
import { LoadingBlock } from '../components/PageParts';
import { useAutoRefresh } from '../components/LiveUpdates';
import type { SupplierDonationSummaryDto } from '../types/api';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSupplierDonations, selectSupplierDonations, selectSupplierDonationsError } from '../store/supplierSlice';
import { DONATION_STATUS_LABELS, MATCH_STATUS_LABELS, formatDateTime, formatPickupWindow, formatTime } from '../utils/format';
import DonationLink from '../components/DonationLink';

const IN_HANDS = ['Matched', 'PickedUp', 'Delivered'];
const FINISHED = ['Completed', 'Cancelled', 'Expired'];
// המזון הגיע לעמותה (גם לפני שהעמותה אישרה את הקבלה)
const RESCUED = ['Delivered', 'Completed'];

const kg = (value: number) => `${value.toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג`;
const weightOf = (d: SupplierDonationSummaryDto) => d.totalWeightKg ?? 0;
const itemsOf = (d: SupplierDonationSummaryDto) =>
  (d.categories ?? []).map((c) => `${c.categoryName ?? 'פריט'} ×${c.quantity}`).join(' · ');

// תיקון 48: הדשבורד של הספק - לא רק שני מספרים: מה בטיפול עכשיו (מי המתנדב, לאיזו עמותה, מתי מגיעים, מעקב חי),
// מה עוד מחכה למתנדב, כמה מזון הצלתם, ופעולות מהירות.
// תיקון 50: מתעדכן לבד - בכל התראה מהשרת (מתנדב אישר / יצא / אסף / מסר), כל דקה, וכשחוזרים ללשונית.
export function SupplierDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const donations = useAppSelector(selectSupplierDonations);
  const error = useAppSelector(selectSupplierDonationsError);

  const load = useCallback(() => {
    void dispatch(fetchSupplierDonations());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load);

  if (donations === null && !error) return <LoadingBlock text="טוען נתונים מהשרת..." />;

  if (donations === null) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  const waiting = donations.filter((d) => d.status === 'Pending');
  const inHands = donations.filter((d) => IN_HANDS.includes(d.status));
  const completed = donations.filter((d) => d.status === 'Completed');
  const rescuedKg = donations.filter((d) => RESCUED.includes(d.status)).reduce((sum, d) => sum + weightOf(d), 0);
  const recent = donations.filter((d) => FINISHED.includes(d.status)).slice(0, 5);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      {/* תיקון 70: ברכה אישית במקום "הדשבורד שלי" */}
      <DashboardGreeting eyebrow="ארגון תורם" />
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
        <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={() => navigate('/app/supplier/create-donation')}>
          פרסום תרומה חדשה
        </Button>
        <Button variant="outlined" onClick={() => navigate('/app/supplier/open-donations')}>התרומות הפתוחות</Button>
        {/* תיקון 70: הוסר "היסטוריה" - הוא בתפריט */}
      </Stack>

      <StatGrid
        columns={4}
        cards={[
          { label: 'בטיפול עכשיו', value: inHands.length, icon: <LocalShippingIcon /> },
          { label: 'ממתינות למתנדב', value: waiting.length, icon: <HourglassEmptyIcon />, tone: waiting.length > 0 ? 'warning' : 'primary' },
          { label: 'ק"ג מזון שהצלתם', value: Math.round(rescuedKg).toLocaleString('he-IL'), icon: <ScaleIcon /> },
          { label: 'תרומות שהושלמו', value: completed.length, icon: <TaskAltIcon /> },
        ]}
      />

      {donations.length === 0 ? (
        <Card sx={{ p: { xs: 3, md: 5 }, mt: 3, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 1 }}>עוד לא פרסמתם תרומות</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5 }}>
            נשאר אוכל טוב בסוף היום? מפרסמים בדקה (אפשר גם לצלם), והמערכת מוצאת מתנדב ועמותה.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/app/supplier/create-donation')}>
            לפרסום התרומה הראשונה
          </Button>
        </Card>
      ) : (
        <>
          <Section title="בטיפול עכשיו" empty="אין כרגע תרומה שמתנדב בדרך לאסוף או שכבר נאספה.">
            {inHands.map((d) => (
              <DonationCard key={d.id} donation={d} onOpen={() => navigate(`/app/supplier/donation/${d.id}`)}
                onTrack={d.volunteerRouteId != null ? () => navigate(`/app/track/${d.volunteerRouteId}`) : undefined}>
                <Typography color="text.secondary">
                  <strong>מתנדב:</strong> {d.volunteerName ?? '—'} · <strong>עמותה:</strong> {d.ngoName ?? '—'}
                  {d.status === 'Matched' && d.estimatedArrival ? <> · <strong>מגיע לאיסוף בערך ב-</strong>{formatTime(d.estimatedArrival)}</> : null}
                </Typography>
              </DonationCard>
            ))}
          </Section>

          <Section title="ממתינות למתנדב" empty="כל התרומות שלכם כבר שובצו.">
            {waiting.map((d) => (
              <DonationCard key={d.id} donation={d} onOpen={() => navigate(`/app/supplier/donation/${d.id}`)}>
                <Typography color="text.secondary">
                  <strong>איסוף:</strong> {formatPickupWindow(d.earliestPickupTime, d.latestPickupTime)} · מנוע השידוכים מחפש מתנדב ועמותה.
                </Typography>
              </DonationCard>
            ))}
          </Section>

          {recent.length > 0 && (
            <Section title="פעילות אחרונה">
              <Card sx={{ p: { xs: 1.5, md: 2 } }}>
                {recent.map((d, i) => (
                  <Box key={d.id}>
                    {i > 0 && <Divider />}
                    <Stack direction="row" spacing={1.5} sx={{ py: 1.25, px: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography>
                        <DonationLink role="supplier" id={d.id}>תרומה #{d.id}</DonationLink> · {kg(weightOf(d))} · <Box component="span" sx={{ color: 'text.secondary' }}>{formatDateTime(d.createdAt)}</Box>
                      </Typography>
                      <Chip size="small" variant="outlined" color={d.status === 'Completed' ? 'success' : 'default'}
                        label={DONATION_STATUS_LABELS[d.status] ?? d.status} />
                    </Stack>
                  </Box>
                ))}
              </Card>
            </Section>
          )}
        </>
      )}
    </Box>
  );
}

interface SectionProps {
  title: string;
  empty?: string;
  children: React.ReactNode;
}

function Section({ title, empty, children }: SectionProps) {
  const hasItems = React.Children.count(children) > 0;
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 1.5 }}>{title}</Typography>
      {hasItems ? children : empty ? <Typography color="text.secondary">{empty}</Typography> : null}
    </Box>
  );
}

interface DonationCardProps {
  donation: SupplierDonationSummaryDto;
  onOpen: () => void;
  onTrack?: () => void;
  children?: React.ReactNode;
}

function DonationCard({ donation, onOpen, onTrack, children }: DonationCardProps) {
  const statusLabel = donation.matchStatus && donation.status === 'Matched'
    ? MATCH_STATUS_LABELS[donation.matchStatus] ?? DONATION_STATUS_LABELS[donation.status]
    : DONATION_STATUS_LABELS[donation.status] ?? donation.status;
  const items = itemsOf(donation);

  return (
    <Card sx={{ p: { xs: 2.5, md: 3 }, mb: 1.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
          <DonationImage image={donation.image} />
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{donation.id}</Typography>
              <Chip size="small" label={kg(weightOf(donation))} />
              <Chip size="small" variant="outlined" color={donation.status === 'Pending' ? 'warning' : 'primary'} label={statusLabel} />
            </Stack>
            {children}
            {items && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{items}</Typography>}
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {onTrack && (
            <Button variant="contained" startIcon={<MyLocationIcon />} onClick={onTrack}>מעקב חי</Button>
          )}
          <Button variant="text" onClick={onOpen}>פרטים</Button>
        </Stack>
      </Stack>
    </Card>
  );
}
