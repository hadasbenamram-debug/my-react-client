import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';
import { homePathForRole, saveSession } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import type { LinkLoginResponseDto } from '../types/api';

// /app/welcome?token=...  - הקישור במייל "הבקשה שלך אושרה".
// נכנסים ישר למסך הראשון של התפקיד (למתנדב: הגדרת הזמינות) בלי מסך ההתחברות.
// הקישור אישי וחד-פעמי. מי שעדיין עם הסיסמה הזמנית מההרשמה בוחר כאן סיסמה אישית (פעם אחת).
export function WelcomeLinkPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token') ?? '');
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [entering, setEntering] = useState(false);
  // StrictMode מריץ effect פעמיים בפיתוח - הקישור חד-פעמי, ולכן שולחים אותו רק פעם אחת
  const started = useRef(false);

  const enter = (data: LinkLoginResponseDto) => {
    saveSession(data, data.email ?? undefined);
    setEntering(true);
    // טעינה מלאה, כדי שהתפריט והמסכים ייבנו לפי התפקיד של המשתמש שנכנס
    window.location.replace(data.nextPath || homePathForRole(data.role));
  };

  const send = async (password?: string): Promise<void> => {
    const res = await fetch('/api/auth/link-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password ?? null }),
    });

    if (!res.ok) {
      setError(await readErrorMessage(res, 'קישור הכניסה אינו בתוקף. אפשר להתחבר כרגיל עם המייל והסיסמה.'));
      return;
    }

    const data = (await res.json()) as LinkLoginResponseDto;
    if (data.requiresPassword) {
      setEmail(data.email ?? null);
      setNeedsPassword(true);
      return;
    }
    enter(data);
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // הטוקן לא נשאר בשורת הכתובת (היסטוריה / שיתוף מסך)
    window.history.replaceState({}, document.title, window.location.pathname);

    if (!token) {
      setError('הקישור אינו תקין.');
      setLoading(false);
      return;
    }

    send()
      .catch(() => setError('אין תקשורת עם השרת.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirm) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    setBusy(true);
    try {
      await send(newPassword);
    } catch {
      setError('אין תקשורת עם השרת.');
    } finally {
      setBusy(false);
    }
  };

  if (loading || entering) return <LoadingBlock text="מכינים את הכניסה שלך..." />;

  return (
    <Box sx={{ maxWidth: 520, mx: 'auto' }}>
      <PageTitle eyebrow="ברוכים הבאים" title="הבקשה שלך אושרה!" />

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={<Button color="inherit" component={RouterLink} to="/app/login">להתחברות</Button>}
        >
          {error}
        </Alert>
      )}

      {needsPassword && (
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <Typography sx={{ mb: 1, fontWeight: 600 }}>עוד צעד אחד ונכנסים</Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            בחר/י סיסמה אישית במקום הסיסמה הזמנית שנשלחה אליך בהרשמה. איתה תתחבר/י בפעם הבאה
            {email ? ` (עם המייל ${email})` : ''}.
          </Typography>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                label="סיסמה חדשה"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="לפחות 8 תווים"
                slotProps={{ htmlInput: { minLength: 8, maxLength: 100 } }}
              />
              <TextField
                label="אימות סיסמה חדשה"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? 'שומר...' : 'שמירה וכניסה למערכת'}
              </Button>
            </Stack>
          </form>
        </Card>
      )}
    </Box>
  );
}
