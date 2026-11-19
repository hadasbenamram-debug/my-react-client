import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import RestoreOutlinedIcon from '@mui/icons-material/RestoreOutlined';
import PageTitle from '../components/PageTitle';
import { EmptyState } from '../components/PageParts';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import type { UpdateVerificationDto, UserListItemView } from '../types/api';
import { roleTitle } from '../utils/auth';
import { errorMessage, toErrorPayload } from '../api/http';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchAdminUsers, isFirstLoad, restoreUserAccount, selectAdminUsers, updateUserVerification } from '../store/adminSlice';
import { formatDateTime } from '../utils/format';

type Channel = 'email' | 'phone';
const CHANNEL_LABEL: Record<Channel, string> = { email: 'המייל', phone: 'הטלפון' };

// תיקון 51: מה המנהל עומד לשנות - אימות מייל או טלפון של משתמש, לסמן או לבטל
interface PendingVerification {
  user: UserListItemView;
  channel: Channel;
  verify: boolean;
}

// תיקון 63: גם לשונית בעמוד "משתמשים" (AdminPeoplePage) - אז בלי כותרת משלו
interface AdminUsersManagementPageProps {
  /** בתוך עמוד "משתמשים" - בלי כותרת משלו */
  embedded?: boolean;
}

export function AdminUsersManagementPage({ embedded = false }: AdminUsersManagementPageProps) {
  const dispatch = useAppDispatch();
  const usersState = useAppSelector(selectAdminUsers);
  const users = usersState.items ?? [];
  const total = usersState.total;
  const loading = isFirstLoad(usersState, usersState.items !== null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  // תיקון 78: שחזור חשבון שהמשתמש מחק
  const [restoreTarget, setRestoreTarget] = useState<UserListItemView | null>(null);

  useEffect(() => {
    // הרשימה מעומדת בשרת; סך המשתמשים מגיע בכותרת X-Total-Count (נקרא ב-thunk)
    dispatch(fetchAdminUsers())
      .unwrap()
      .catch((err: unknown) => console.error('שגיאה בטעינת משתמשים:', err));
  }, [dispatch]);

  // תיקון 51: מנהל מסמן ידנית שהמייל / הטלפון אומתו (למשל אחרי שיחה עם המשתמש), או מבטל סימון שגוי
  const saveVerification = async () => {
    if (!pending) return;
    setSaving(true);
    const body: UpdateVerificationDto = pending.channel === 'email'
      ? { isEmailVerified: pending.verify }
      : { isPhoneVerified: pending.verify };
    try {
      // המשתמש המעודכן נכנס לרשימה שבסלייס (extraReducers)
      await dispatch(updateUserVerification({ userId: pending.user.id, body })).unwrap();
      setStatus({
        ok: true,
        text: `${CHANNEL_LABEL[pending.channel]} של ${pending.user.name} ${pending.verify ? 'סומן כמאומת' : 'סומן כלא מאומת'}.`,
      });
      setPending(null);
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err, 'לא ניתן לעדכן את האימות כרגע.') });
    } finally {
      setSaving(false);
    }
  };

  // תיקון 78: מנהל משחזר חשבון שנמחק (המשתמש פנה דרך "צור קשר")
  const restoreAccount = async () => {
    if (!restoreTarget) return;
    setSaving(true);
    try {
      // החשבון המשוחזר מתעדכן ברשימה שבסלייס (extraReducers)
      await dispatch(restoreUserAccount(restoreTarget.id)).unwrap();
      setStatus({
        ok: true,
        text: `החשבון של ${restoreTarget.name} שוחזר. אפשר להתחבר אליו שוב עם אותו מייל ואותה סיסמה.`,
      });
      setRestoreTarget(null);
    } catch (err) {
      const payload = toErrorPayload(err, 'לא ניתן לשחזר את החשבון כרגע.');
      setStatus({ ok: false, text: payload.message });
      // תשובת שגיאה מהשרת סוגרת את הדיאלוג (כמו קודם); בלי תקשורת הוא נשאר פתוח
      if (payload.status !== 0) setRestoreTarget(null);
    } finally {
      setSaving(false);
    }
  };

  const verificationChip = (user: UserListItemView, channel: Channel) => {
    const verified = channel === 'email' ? user.isEmailVerified : user.isPhoneVerified;
    const label = channel === 'email'
      ? (verified ? 'מייל מאומת' : 'מייל לא מאומת')
      : (verified ? 'טלפון מאומת' : 'טלפון לא מאומת');
    return (
      <Tooltip title={verified ? 'לחיצה לביטול האימות' : 'לחיצה לסימון ידני כמאומת'}>
        <Chip size="small" variant="outlined" color={verified ? 'success' : 'default'} label={label}
          onClick={() => { setStatus(null); setPending({ user, channel, verify: !verified }); }} />
      </Tooltip>
    );
  };

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען רשימת משתמשים...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      {embedded ? (
        total != null && <Typography color="text.secondary" sx={{ mb: 2 }}>{total} משתמשים רשומים.</Typography>
      ) : (
        <PageTitle
          eyebrow="ניהול מערכת"
          title="ניהול משתמשים"
          subtitle={total != null ? `${total} משתמשים רשומים.` : 'חיפוש וצפייה במשתמשים רשומים.'}
        />
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        משתמש מאמת את המייל והטלפון בעצמו בעמוד "הפרופיל שלי" ← "אימות פרטי קשר" (קוד בן 6 ספרות במייל, במסרון או בשיחה קולית).
        המייל מסומן כמאומת גם כשהמשתמש נכנס דרך קישור שנשלח למייל או מאפס סיסמה.
        אפשר גם לסמן ידנית - בלחיצה על התגית (למשל אחרי שיחה עם המשתמש).
      </Alert>

      {status && (
        <Alert severity={status.ok ? 'success' : 'error'} sx={{ mb: 3 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <TextField
        placeholder="חפש לפי שם או אימייל..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {filteredUsers.length === 0 ? (
        // תיקון 76: מסך ריק עם הצעד הבא
        <EmptyState
          icon={<SearchOffIcon />}
          title="לא נמצאו משתמשים"
          text={searchTerm.trim() !== ''
            ? 'אין משתמש שתואם את החיפוש. כדאי לבדוק את האיות או לחפש לפי חלק מהשם או מהמייל.'
            : 'עוד אין משתמשים להצגה.'}
          action={searchTerm.trim() !== '' ? { label: 'ניקוי החיפוש', onClick: () => setSearchTerm('') } : undefined}
        />
      ) : (
        filteredUsers.map((user) => (
          <Card
            key={user.id}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{user.name}</Typography>
                {/* תיקון 77: חשבון שהמשתמש מחק - לא מתחבר ולא משובץ */}
                {user.isActive === false ? (
                  <>
                    <Chip size="small" color="error" variant="outlined"
                      label={user.deactivatedAt
                        ? `החשבון נמחק ב-${formatDateTime(user.deactivatedAt)}`
                        : 'החשבון נמחק'} />
                    {/* תיקון 78 */}
                    <Button size="small" variant="outlined" startIcon={<RestoreOutlinedIcon />}
                      onClick={() => { setStatus(null); setRestoreTarget(user); }}>
                      שחזור חשבון
                    </Button>
                  </>
                ) : (
                  <>
                    {verificationChip(user, 'email')}
                    {verificationChip(user, 'phone')}
                  </>
                )}
              </Box>
              {/* תיקון 10: לחשבון יכולים להיות כמה תפקידים (למשל ספק שהוא גם מתנדב) */}
              <Typography color="text.secondary">
                <strong>{(user.roles?.length ?? 0) > 1 ? 'תפקידים:' : 'תפקיד:'}</strong>{' '}
                {(user.roles?.length ? user.roles : [user.role]).map(roleTitle).join(' + ')}
              </Typography>
              <Typography color="text.secondary"><strong>אימייל:</strong> {user.email}</Typography>
              <Typography color="text.secondary"><strong>טלפון:</strong> {user.phone || '—'}</Typography>
            </Box>
          </Card>
        ))
      )}

      <Dialog open={pending !== null} onClose={saving ? undefined : () => setPending(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {pending?.verify ? 'סימון ידני כמאומת' : 'ביטול אימות'}
        </DialogTitle>
        <DialogContent dividers>
          {pending && (
            <Typography>
              {pending.verify
                ? <>לסמן ש{CHANNEL_LABEL[pending.channel]} של <strong>{pending.user.name}</strong> ({pending.channel === 'email' ? pending.user.email : pending.user.phone || '—'}) אומת?
                    {' '}כדאי לעשות זאת רק אחרי שווידאת שהפרטים נכונים ושייכים למשתמש.</>
                : <>לבטל את אימות {CHANNEL_LABEL[pending.channel]} של <strong>{pending.user.name}</strong>?
                    {' '}המשתמש יוכל לאמת שוב בעצמו בעמוד "הפרופיל שלי".</>}
              {pending.channel === 'phone' && pending.verify && (
                <Box component="span" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                  טלפון מאומת מאפשר לשלוח למשתמש גם מסרונים.
                </Box>
              )}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button color="error" onClick={() => setPending(null)} disabled={saving}>ביטול</Button>
          <Button variant="contained" color={pending?.verify ? 'primary' : 'error'} onClick={() => void saveVerification()} disabled={saving}>
            {saving ? 'שומר...' : pending?.verify ? 'סימון כמאומת' : 'ביטול האימות'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* תיקון 78: אישור לפני שחזור חשבון שנמחק */}
      <Dialog open={restoreTarget !== null} onClose={saving ? undefined : () => setRestoreTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>שחזור חשבון</DialogTitle>
        <DialogContent dividers>
          {restoreTarget && (
            <Typography>
              לשחזר את החשבון של <strong>{restoreTarget.name}</strong> ({restoreTarget.email})?
              <Box component="span" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                המשתמש יוכל להתחבר שוב עם אותו מייל ואותה סיסמה, עם כל התפקידים וההיסטוריה שלו.
                מתנדב יחזור לקבל בקשות איסוף לפי הזמינות השבועית שלו.
                כדאי לשחזר רק אחרי שווידאת שהבקשה הגיעה מבעל החשבון.
              </Box>
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setRestoreTarget(null)} disabled={saving}>ביטול</Button>
          <Button variant="contained" onClick={() => void restoreAccount()} disabled={saving}>
            {saving ? 'משחזר...' : 'שחזור החשבון'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
