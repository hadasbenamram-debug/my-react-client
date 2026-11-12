import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ScaleIcon from '@mui/icons-material/Scale';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PageTitle from '../components/PageTitle';
import StatGrid from '../components/StatGrid';
import DonationImage from '../components/DonationImage';
import { LoadingBlock } from '../components/PageParts';
import { useAutoRefresh } from '../components/LiveUpdates';
import type { NgoDonationView, NgoResponseDto } from '../types/api';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { MATCH_STATUS_LABELS, formatDateTime, formatTime, formatTimeSpan } from '../utils/format';
import DonationLink from '../components/DonationLink';
import { canConfirmReceipt, confirmDonationReceipt, ratingPath } from '../utils/confirmReceipt';

// השידוך חי: ממתין למתנדב / אושר / המתנדב בדרך לאיסוף / נאסף ובדרך לעמותה
const ON_THE_WAY = ['AwaitingVolunteerConfirmation', 'Confirmed', 'InPickup', 'InTransit'];

const kg = (value: number) => `${value.toLocaleString('he-IL', { maximumFractionDigits: 1 })} ק"ג`;
const items = (d: NgoDonationView) => d.categories.map((c) => `${c.categoryName ?? 'פריט'} ×${c.quantity}`).join(' · ');

const asDate = (iso: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
const isToday = (iso: string | null) => !!iso && asDate(iso).toDateString() === new Date().toDateString();

// שעות הקבלה של היום (לפי היום בשבוע בשעון המקומי)
const todaysHours = (ngo: NgoResponseDto): string => {
  const day = new Date().getDay();   // 0 = ראשון
  if (day === 6) {
    return ngo.receivesOnSaturdayNight && ngo.saturdayNightOpenTime && ngo.saturdayNightCloseTime
      ? `מוצאי שבת, מ-${formatTimeSpan(ngo.saturdayNightOpenTime)} עד ${formatTimeSpan(ngo.saturdayNightCloseTime)}`
      : 'היום (שבת) העמותה לא מקבלת תרומות';
  }
  if (day === 5) {
    return ngo.receivesOnFriday && ngo.fridayOpenTime && ngo.fridayCloseTime
      ? `מ-${formatTimeSpan(ngo.fridayOpenTime)} עד ${formatTimeSpan(ngo.fridayCloseTime)}`
      : 'היום (שישי) העמותה לא מקבלת תרומות';
  }
  return `מ-${formatTimeSpan(ngo.sunToThuOpenTime)} עד ${formatTimeSpan(ngo.sunToThuCloseTime)}`;
};

// תיקון 48: הדשבורד של העמותה - מה בדרך אליכם (מי המתנדב, מאיזה ספק, מעקב חי), מה מחכה לאישור קבלה,
// כמה מזון התקבל היום, שעות הקבלה והקיבולת של היום, ופעולות מהירות.
// תיקון 50: מתעדכן לבד - בכל התראה מהשרת (מתנדב אישר / יצא / אסף / מסר), כל דקה, וכשחוזרים ללשונית.
export function NgoDashboard() {
  const navigate = useNavigate();
  const [donations, setDonations] = useState<NgoDonationView[] | null>(null);
  const [ngo, setNgo] = useState<NgoResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  // תיקון 63: אישור קבלה ישירות מהדשבורד (הדף "אישור קבלה" נמחק)
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const confirm = async (donationId: number) => {
    setConfirmError(null);
    setConfirmingId(donationId);
    try {
      navigate(ratingPath(await confirmDonationReceipt(donationId)));
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : 'שגיאת תקשורת מול השרת.');
      setConfirmingId(null);
    }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const load = useCallback(() => {
    fetch('/api/donations/my-ngo-donations', { headers: authHeaders() })
      .then(async (res) => {
        if (!res.ok) throw new Error(await readErrorMessage(res, `שגיאה בשרת: ${res.status}`));
        return (await res.json()) as NgoDonationView[];
      })
      .then((data) => {
        setDonations(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתוני העמותה.'));

    fetch('/api/ngos/me', { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as NgoResponseDto) : null))
      .then((data) => {
        if (data) setNgo(data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useAutoRefresh(load);

  if (donations === null && !error) return <LoadingBlock text="טוען נתוני עמותה מהשרת..." />;

  if (donations === null) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // התרומות של העמותה הן תרומות ששובצו אליה (השידוך האחרון לכל תרומה)
  const onTheWay = donations.filter((d) => d.matchStatus != null && ON_THE_WAY.includes(d.matchStatus)
    && (d.status === 'Matched' || d.status === 'PickedUp'));
  const toConfirm = donations.filter((d) => d.status === 'Delivered');
  const received = donations.filter((d) => d.status === 'Completed');
  const receivedTodayKg = received.filter((d) => isToday(d.receivedAt)).reduce((sum, d) => sum + d.totalWeightKg, 0);
  const assignedTodayKg = donations
    .filter((d) => isToday(d.createdAt) && d.status !== 'Cancelled' && d.status !== 'Expired'
      && (d.matchStatus == null || ON_THE_WAY.includes(d.matchStatus) || d.matchStatus === 'Completed'))
    .reduce((sum, d) => sum + d.totalWeightKg, 0);
  const recent = received
    .slice()
    .sort((a, b) => (b.receivedAt ?? '').localeCompare(a.receivedAt ?? ''))
    .slice(0, 5);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <PageTitle
        eyebrow="עמותה"
        title="הדשבורד שלי"
        subtitle="מה בדרך אליכם, מה מחכה לאישור קבלה, וכמה מזון כבר הגיע."
      />
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}
      {confirmError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setConfirmError(null)}>{confirmError}</Alert>}

      {toConfirm.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, alignItems: 'center' }}
          action={<Button color="inherit" variant="outlined" size="small" sx={{ px: 2 }} onClick={() => scrollTo('ngo-to-confirm')}>לאישור קבלה</Button>}>
          {toConfirm.length === 1 ? 'תרומה אחת נמסרה ומחכה לאישור הקבלה שלכם.' : `${toConfirm.length} תרומות נמסרו ומחכות לאישור הקבלה שלכם.`}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', gap: 1.5 }}>
        {/* תיקון 62: הדף "תרומות נכנסות" נמחק - הכפתור גולל לרשימת "בדרך אליכם" שכאן בדשבורד */}
        <Button variant="contained" startIcon={<LocalShippingIcon />} onClick={() => scrollTo('ngo-on-the-way')}>תרומות בדרך</Button>
        {/* תיקון 63: גם "אישור קבלה" כבר לא דף נפרד - הכפתור גולל לרשימה שכאן (מופיע רק כשיש מה לאשר) */}
        {toConfirm.length > 0 && (
          <Button variant="outlined" startIcon={<FactCheckIcon />} onClick={() => scrollTo('ngo-to-confirm')}>אישור קבלה</Button>
        )}
        <Button variant="outlined" startIcon={<AccessTimeIcon />} onClick={() => navigate('/app/ngo/hours')}>שעות קבלה</Button>
        <Button variant="text" onClick={() => navigate('/app/ngo/history')}>היסטוריה</Button>
      </Stack>

      <StatGrid
        columns={4}
        cards={[
          { label: 'בדרך אליכם', value: onTheWay.length, icon: <LocalShippingIcon /> },
          { label: 'מחכות לאישור קבלה', value: toConfirm.length, icon: <FactCheckIcon />, tone: toConfirm.length > 0 ? 'warning' : 'primary' },
          { label: 'ק"ג שהתקבלו היום', value: Math.round(receivedTodayKg).toLocaleString('he-IL'), icon: <ScaleIcon /> },
          { label: 'תרומות שהתקבלו', value: received.length, icon: <TaskAltIcon /> },
        ]}
      />

      {ngo && (
        <Card sx={{ p: { xs: 2.5, md: 3 }, mt: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 1, md: 4 }}>
            <Typography><strong>שעות קבלה היום:</strong> {todaysHours(ngo)}</Typography>
            <Typography>
              <strong>קיבולת יומית:</strong> {ngo.dailyCapacity > 0 ? kg(ngo.dailyCapacity) : 'ללא הגבלה'}
              {ngo.dailyCapacity > 0 && <> · הופנו אליכם היום {kg(assignedTodayKg)}</>}
            </Typography>
          </Stack>
        </Card>
      )}

      {/* תיקון 63: מה שהמתנדב סימן שמסר - מאשרים כאן בלחיצה, ומשם עוברים לדירוג */}
      {toConfirm.length > 0 && (
        <Section id="ngo-to-confirm" title="מחכות לאישור קבלה">
          {toConfirm.map((d) => (
            <Card key={d.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 1.5, borderInlineStart: (t) => `5px solid ${t.palette.warning.main}` }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
                  <DonationImage image={d.image} />
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                      <Typography variant="h6" sx={{ fontWeight: 500 }}><DonationLink role="ngo" id={d.id}>תרומה #{d.id}</DonationLink></Typography>
                      <Chip size="small" label={kg(d.totalWeightKg)} />
                    </Stack>
                    <Typography color="text.secondary">
                      <strong>מאת:</strong> {d.supplierName ?? '—'} · <strong>מתנדב:</strong> {d.volunteerName ?? '—'}
                    </Typography>
                    {d.categories.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{items(d)}</Typography>}
                  </Box>
                </Stack>
                <Button variant="contained" startIcon={<FactCheckIcon />} sx={{ flexShrink: 0 }}
                  disabled={confirmingId !== null} onClick={() => void confirm(d.id)}>
                  {confirmingId === d.id ? 'מאשר...' : 'אישור קבלה'}
                </Button>
              </Stack>
            </Card>
          ))}
        </Section>
      )}

      <Section id="ngo-on-the-way" title="בדרך אליכם" empty="אין כרגע תרומות בדרך אליכם. כשמתנדב יאשר מסלול - הוא יופיע כאן מיד.">
        {onTheWay.map((d) => (
          <Card key={d.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 1.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', minWidth: 0 }}>
                <DonationImage image={d.image} />
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}><DonationLink role="ngo" id={d.id}>תרומה #{d.id}</DonationLink></Typography>
                    <Chip size="small" label={kg(d.totalWeightKg)} />
                    <Chip size="small" variant="outlined" color={d.matchStatus === 'InTransit' ? 'success' : 'primary'}
                      label={d.matchStatus ? MATCH_STATUS_LABELS[d.matchStatus] ?? d.matchStatus : 'בדרך'} />
                  </Stack>
                  <Typography color="text.secondary">
                    <strong>מאת:</strong> {d.supplierName ?? '—'} · <strong>מתנדב:</strong> {d.volunteerName ?? 'ממתין לאישור מתנדב'}
                    {d.matchStatus !== 'InTransit' && d.estimatedArrival ? <> · <strong>איסוף בערך ב-</strong>{formatTime(d.estimatedArrival)}</> : null}
                  </Typography>
                  {d.categories.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{items(d)}</Typography>}
                </Box>
              </Stack>
              <Stack spacing={1} sx={{ flexShrink: 0, alignItems: { sm: 'flex-end' } }}>
                {d.volunteerRouteId != null && d.matchStatus !== 'AwaitingVolunteerConfirmation' && (
                  <Button variant={d.matchStatus === 'InPickup' || d.matchStatus === 'InTransit' ? 'contained' : 'outlined'}
                    startIcon={<MyLocationIcon />} onClick={() => navigate(`/app/track/${d.volunteerRouteId}`)}>
                    מעקב חי
                  </Button>
                )}
                {/* תיקון 63: המזון כבר נאסף - אם הגיע והמתנדב עוד לא סימן מסירה, אפשר לאשר מכאן */}
                {canConfirmReceipt(d.status) && (
                  <Button variant="text" size="small" disabled={confirmingId !== null} onClick={() => void confirm(d.id)}>
                    {confirmingId === d.id ? 'מאשר...' : 'הגיע אליכם? אישור קבלה'}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Card>
        ))}
      </Section>

      {recent.length > 0 && (
        <Section title="התקבלו לאחרונה">
          <Card sx={{ p: { xs: 1.5, md: 2 } }}>
            {recent.map((d, i) => (
              <Box key={d.id}>
                {i > 0 && <Divider />}
                <Stack direction="row" spacing={1.5} sx={{ py: 1.25, px: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography>
                    <DonationLink role="ngo" id={d.id}>תרומה #{d.id}</DonationLink> מ{d.supplierName ?? 'ספק'} · {kg(d.totalWeightKg)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">{formatDateTime(d.receivedAt)}</Typography>
                </Stack>
              </Box>
            ))}
          </Card>
        </Section>
      )}
    </Box>
  );
}

function Section({ id, title, empty, children }: { id?: string; title: string; empty?: string; children: React.ReactNode }) {
  const hasItems = React.Children.count(children) > 0;
  return (
    <Box id={id} sx={{ mt: 4, scrollMarginTop: '96px' }}>
      <Typography variant="h5" sx={{ mb: 1.5 }}>{title}</Typography>
      {hasItems ? children : empty ? <Typography color="text.secondary">{empty}</Typography> : null}
    </Box>
  );
}
