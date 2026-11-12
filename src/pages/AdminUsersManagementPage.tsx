import React, { useState, useEffect } from 'react';
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
import PageTitle from '../components/PageTitle';
import type { UpdateVerificationDto, UserDto, UserListItemView } from '../types/api';
import { authHeaders, getToken, roleTitle } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';

type Channel = 'email' | 'phone';
const CHANNEL_LABEL: Record<Channel, string> = { email: 'המייל', phone: 'הטלפון' };

// תיקון 51: מה המנהל עומד לשנות - אימות מייל או טלפון של משתמש, לסמן או לבטל
interface PendingVerification {
  user: UserListItemView;
  channel: Channel;
  verify: boolean;
}

// תיקון 63: גם לשונית בעמוד "משתמשים" (AdminPeoplePage) - אז בלי כותרת משלו
export function AdminUsersManagementPage({ embedded = false }: { embedded?: boolean }) {
  const [users, setUsers] = useState<UserListItemView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [pending, setPending] = useState<PendingVerification | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const fetchUsers = () => {
    const token = getToken();

    // הרשימה מעומדת בשרת; סך המשתמשים מגיע בכותרת X-Total-Count
    fetch('/api/users?page=1&pageSize=500', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת משתמשים');
        const totalHeader = res.headers.get('X-Total-Count');
        setTotal(totalHeader ? Number(totalHeader) : null);
        return res.json();
      })
      .then((data: UserListItemView[]) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת משתמשים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // תיקון 51: מנהל מסמן ידנית שהמייל / הטלפון אומתו (למשל אחרי שיחה עם המשתמש), או מבטל סימון שגוי
  const saveVerification = async () => {
    if (!pending) return;
    setSaving(true);
    const body: UpdateVerificationDto = pending.channel === 'email'
      ? { isEmailVerified: pending.verify }
      : { isPhoneVerified: pending.verify };
    try {
      const response = await fetch(`/api/users/${pending.user.id}/verification`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setStatus({ ok: false, text: await readErrorMessage(response, 'לא ניתן לעדכן את האימות כרגע.') });
        return;
      }
      const updated = (await response.json()) as UserDto;
      setUsers((list) => list.map((u) => (u.id === updated.id
        ? { ...u, isEmailVerified: updated.isEmailVerified, isPhoneVerified: updated.isPhoneVerified }
        : u)));
      setStatus({
        ok: true,
        text: `${CHANNEL_LABEL[pending.channel]} של ${pending.user.name} ${pending.verify ? 'סומן כמאומת' : 'סומן כלא מאומת'}.`,
      });
      setPending(null);
    } catch {
      setStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
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
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">לא נמצאו משתמשים התואמים את החיפוש.</Typography>
        </Card>
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
                {verificationChip(user, 'email')}
                {verificationChip(user, 'phone')}
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
    </Box>
  );
}
