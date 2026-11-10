import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import ManualAssignDialog from '../components/ManualAssignDialog';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { DONATION_STATUS_LABELS, formatAgo, formatDateTime, formatTime, MATCH_STATUS_LABELS } from '../utils/format';
import type { AwaitingPickupRouteDto, NoShowBoardDto, NoShowDto, NoShowEventDto } from '../types/api';

// הלוח מתרענן כל דקה (איחורים מתעדכנים, תרומות ששובצו מחדש)
const REFRESH_MS = 60_000;

type Notice = { text: string; ok: boolean };

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return <>—</>;
  return (
    <Link href={`tel:${phone}`} underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
      <PhoneOutlinedIcon sx={{ fontSize: 17 }} />
      <span dir="ltr">{phone}</span>
    </Link>
  );
}

function LatenessChip({ route }: { route: AwaitingPickupRouteDto }) {
  if (route.minutesLate > 0) {
    return <Chip size="small" color="error" label={`באיחור של ${route.minutesLate} דק'`} sx={{ color: '#fff' }} />;
  }
  return <Chip size="small" variant="outlined" label={`הגעה משוערת ${formatTime(route.nextPickupEta)}`} />;
}

const donationChip = (event: NoShowEventDto) => {
  if (event.reassignedToVolunteerName) {
    return <Chip size="small" color="success" label={`שובצה מחדש ל${event.reassignedToVolunteerName}`} sx={{ color: '#fff' }} />;
  }
  const label = DONATION_STATUS_LABELS[event.donationStatus] ?? event.donationStatus;
  return <Chip size="small" color={event.donationStatus === 'Pending' ? 'warning' : 'default'} label={label} />;
};

// תיקון 36: טיפול ידני של המנהל באי-הגעה (No-Show).
// בעבר: רשימה של שיבוצים מאושרים עם כפתור "סמן No-Show" (window.prompt), והתרומות תמיד חזרו לשיבוץ אוטומטי.
// עכשיו: מי מאחר ובכמה (כולל טלפון למתנדב ומעקב חי), סימון אי-הגעה עם בחירה - שיבוץ אוטומטי מחדש או שיבוץ ידני
// למתנדב שהמנהל בוחר - ושיבוץ ידני גם לתרומות שכבר סומנו.
export function AdminNoShowPage() {
  const navigate = useNavigate();
  const [board, setBoard] = useState<NoShowBoardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // דיאלוג סימון אי-הגעה
  const [noShowRoute, setNoShowRoute] = useState<AwaitingPickupRouteDto | null>(null);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);

  // דיאלוג שיבוץ ידני
  const [assignDonationId, setAssignDonationId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/matches/no-show/board', { headers: authHeaders() });
      if (!res.ok) {
        setLoadError(await readErrorMessage(res, 'לא ניתן לטעון את נתוני אי-ההגעה.'));
        return;
      }
      setBoard((await res.json()) as NoShowBoardDto);
      setLoadError(null);
      setNow(Date.now());
    } catch {
      setLoadError('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const openNoShow = (route: AwaitingPickupRouteDto) => {
    setNoShowRoute(route);
    setReason('');
    setMode('auto');
    setMarkError(null);
  };

  const markNoShow = async () => {
    if (!noShowRoute) return;
    setMarking(true);
    setMarkError(null);
    try {
      const body: NoShowDto = { reason: reason.trim() || null, autoReassign: mode === 'auto' };
      const res = await fetch(`/api/matches/${noShowRoute.matchId}/no-show`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setMarkError(await readErrorMessage(res, 'הסימון נכשל.'));
        return;
      }
      const result = (await res.json().catch(() => null)) as { message?: string } | null;
      const firstDonation = noShowRoute.stops[0]?.donationId ?? null;
      setNoShowRoute(null);
      setNotice({ text: result?.message ?? 'סומן No-Show.', ok: true });
      await load();
      // שיבוץ ידני: פותחים מיד את בחירת המתנדב לתרומה הראשונה (השאר מופיעות למטה, ב"תרומות שסומנו No-Show")
      if (mode === 'manual' && firstDonation !== null) setAssignDonationId(firstDonation);
    } catch {
      setMarkError('שגיאת תקשורת מול השרת.');
    } finally {
      setMarking(false);
    }
  };

  const autoReassign = async (donationId: number) => {
    setNotice(null);
    try {
      const res = await fetch(`/api/matches/assign-donation/${donationId}`, { method: 'POST', headers: authHeaders() });
      const body = (await res.json().catch(() => null)) as { matched?: boolean; message?: string } | null;
      setNotice({ text: body?.message ?? (res.ok ? 'בוצע.' : 'הפעולה נכשלה.'), ok: res.ok && body?.matched === true });
    } catch {
      setNotice({ text: 'שגיאת תקשורת מול השרת.', ok: false });
    }
    await load();
  };

  if (loading) return <LoadingBlock text="טוען נתוני אי-הגעה..." />;

  const awaiting = board?.awaitingPickup ?? [];
  const noShows = board?.noShows ?? [];
  const lateCount = awaiting.filter((r) => r.minutesLate > 0).length;

  const card = (key: string | number, highlight: boolean, content: ReactNode, actions: ReactNode) => (
    <Card
      key={key}
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 2,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', md: 'center' },
        gap: 2,
        // מסלול באיחור - פס אדום בצד (צבע מה-theme; borderInlineStartColor לא מתורגם לצבע של ה-theme)
        borderInlineStart: highlight ? (theme) => `5px solid ${theme.palette.error.main}` : undefined,
      }}
    >
      <Box sx={{ minWidth: 0 }}>{content}</Box>
      <Stack direction={{ xs: 'column', sm: 'row', md: 'column' }} spacing={1} sx={{ flexShrink: 0 }}>
        {actions}
      </Stack>
    </Card>
  );

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="טיפול באי-הגעה (No-Show)"
        subtitle="מי מאחר לאיסוף ובכמה. אפשר להתקשר למתנדב, לעקוב אחריו בזמן אמת, לסמן אי-הגעה - ולבחור אם המערכת משבצת מחדש אוטומטית או שאתם בוחרים מתנדב."
      />

      {loadError && <Alert severity="warning" sx={{ mb: 2 }}>{loadError}</Alert>}
      {notice && <Alert severity={notice.ok ? 'success' : 'warning'} sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice.text}</Alert>}

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6">
          ממתינים לאיסוף
          {lateCount > 0 && <Chip size="small" color="error" label={`${lateCount} באיחור`} sx={{ ml: 1, color: '#fff' }} />}
        </Typography>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => void load()}>רענון</Button>
      </Stack>

      {awaiting.length === 0
        ? <EmptyState text="אין מסלולים מאושרים שממתינים לאיסוף." />
        : awaiting.map((route) => card(
          route.routeId ?? `m${route.matchId}`,
          route.minutesLate > 0,
          <>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {route.routeId ? `מסלול #${route.routeId}` : `תרומה #${route.stops[0]?.donationId}`}
              </Typography>
              <LatenessChip route={route} />
              <Chip size="small" label={route.started ? 'יצא לדרך' : 'טרם יצא לדרך'} />
            </Stack>
            <Typography color="text.secondary">
              <strong>מתנדב:</strong> {route.volunteerName} · <PhoneLink phone={route.volunteerPhone} />
            </Typography>
            <Typography color="text.secondary">
              <strong>מיקום אחרון:</strong> {route.lastLocationAt ? formatAgo(route.lastLocationAt, now) : 'לא שיתף מיקום'}
            </Typography>
            {route.stops.map((stop, index) => (
              <Typography key={stop.matchId} color="text.secondary" variant="body2">
                {index + 1}. תרומה #{stop.donationId} · {stop.supplierName ?? '—'}{stop.pickupAddress ? ` · ${stop.pickupAddress}` : ''}
                {' '}· {MATCH_STATUS_LABELS[stop.status] ?? stop.status} · הגעה משוערת {formatTime(stop.estimatedArrival)}
              </Typography>
            ))}
          </>,
          <>
            {route.routeId && (
              <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={() => navigate(`/app/track/${route.routeId}`)}>
                מעקב חי
              </Button>
            )}
            <Button variant="contained" color="error" onClick={() => openNoShow(route)}>סימון אי-הגעה</Button>
          </>
        ))}

      <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>תרומות שסומנו No-Show</Typography>
      {noShows.length === 0
        ? <EmptyState text="אין אירועי No-Show." />
        : noShows.map((event) => card(
          event.matchId,
          false,
          <>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{event.donationId}</Typography>
              {donationChip(event)}
            </Stack>
            <Typography color="text.secondary">
              <strong>מתנדב שלא הגיע:</strong> {event.volunteerName} · <PhoneLink phone={event.volunteerPhone} />
            </Typography>
            <Typography color="text.secondary">
              <strong>איסוף:</strong> {event.supplierName ?? '—'}{event.pickupAddress ? ` · ${event.pickupAddress}` : ''}
            </Typography>
            <Typography color="text.secondary" variant="body2">שובץ ב-{formatDateTime(event.assignedAt)}</Typography>
          </>,
          event.canAssign ? (
            <>
              <Button variant="contained" startIcon={<PersonSearchOutlinedIcon />} onClick={() => setAssignDonationId(event.donationId)}>
                שיבוץ ידני למתנדב
              </Button>
              <Button variant="outlined" onClick={() => void autoReassign(event.donationId)}>שיבוץ אוטומטי עכשיו</Button>
            </>
          ) : null
        ))}

      {/* סימון אי-הגעה: סיבה + מה עושים עם התרומות */}
      <Dialog open={noShowRoute !== null} onClose={marking ? undefined : () => setNoShowRoute(null)} fullWidth maxWidth="sm">
        <DialogTitle>סימון אי-הגעה{noShowRoute ? ` - ${noShowRoute.volunteerName}` : ''}</DialogTitle>
        <DialogContent dividers>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            כל התחנות שעוד לא נאספו במסלול יסומנו No-Show, ציון האמינות של המתנדב יירד, והוא יקבל הודעה.
            {noShowRoute?.volunteerPhone ? ' לפני הסימון כדאי לנסות להתקשר אליו: ' : ''}
            {noShowRoute?.volunteerPhone && <PhoneLink phone={noShowRoute.volunteerPhone} />}
          </Typography>
          <TextField
            label="סיבה (לא חובה)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            slotProps={{ htmlInput: { maxLength: 300 } }}
            helperText="תישלח למתנדב בהודעה"
          />
          <Typography sx={{ fontWeight: 500, mt: 2.5, mb: 0.5 }}>מה לעשות עם התרומות?</Typography>
          <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as 'auto' | 'manual')}>
            <FormControlLabel value="auto" control={<Radio />} label="המערכת תשבץ אותן מחדש אוטומטית, מיד (מומלץ)" />
            <FormControlLabel value="manual" control={<Radio />} label="אבחר בעצמי מתנדב (למשל אחרי שיחה איתו)" />
          </RadioGroup>
          {mode === 'manual' && (
            <Typography variant="body2" color="text.secondary">
              אחרי הסימון תיפתח בחירת מתנדב לתרומה הראשונה, והשאר יופיעו ב"תרומות שסומנו No-Show". תרומה שלא תשובץ ידנית -
              המנוע ישבץ אותה בריצה הבאה.
            </Typography>
          )}
          {markError && <Alert severity="error" sx={{ mt: 2 }}>{markError}</Alert>}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setNoShowRoute(null)} disabled={marking}>ביטול</Button>
          <Button variant="contained" color="error" onClick={() => void markNoShow()} disabled={marking}>
            {marking ? 'מסמן...' : 'סימון אי-הגעה'}
          </Button>
        </DialogActions>
      </Dialog>

      <ManualAssignDialog
        donationId={assignDonationId}
        onClose={() => setAssignDonationId(null)}
        onAssigned={(text) => {
          setAssignDonationId(null);
          setNotice({ text, ok: true });
          void load();
        }}
      />
    </Box>
  );
}
