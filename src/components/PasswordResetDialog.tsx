import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

// תיקון 69: איפוס סיסמה בחלון מתוך מסך ההתחברות ("שכחת סיסמה?") - במקום הדפים forgot-password / reset-password.
//   קישור במייל: נשלח קישור + קוד; הקישור פותח את החלון הזה עם הקוד (initialToken), ואפשר גם להדביק את הקוד ידנית.
//   קוד לטלפון (תיקון 67): קוד במסרון או בשיחה קולית למספר המאומת.
type Channel = 'email' | 'phone';
type PhoneMethod = 'sms' | 'call';
type Status = { ok: boolean; text: string } | null;

interface PasswordResetDialogProps {
  open: boolean;
  initialEmail?: string;
  /** הקוד מהקישור שבמייל - החלון נפתח ישר בבחירת סיסמה חדשה */
  initialToken?: string | null;
  onClose: () => void;
  /** הסיסמה אופסה - ההודעה מוצגת במסך ההתחברות */
  onDone: (message: string) => void;
}

async function postJson(url: string, data: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const body = await response.json().catch(() => null);
  const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;
  return { ok: response.ok, message: (firstError || body?.message) as string | undefined };
}

export default function PasswordResetDialog({ open, initialEmail, initialToken, onClose, onDone }: PasswordResetDialogProps) {
  const [channel, setChannel] = useState<Channel>('email');
  const [email, setEmail] = useState('');
  const [codeStep, setCodeStep] = useState(false);   // false = בקשת קוד, true = הזנת קוד + סיסמה חדשה
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState<'email' | PhoneMethod | 'reset' | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // כל פתיחה מתחילה מחדש
  useEffect(() => {
    if (!open) return;
    setChannel('email');
    setEmail(initialEmail ?? '');
    setCodeStep(!!initialToken);
    setCode(initialToken ?? '');
    setNewPassword('');
    setConfirm('');
    setBusy(null);
    setStatus(null);
  }, [open, initialEmail, initialToken]);

  const fromLink = !!initialToken;

  const changeChannel = (_: React.MouseEvent<HTMLElement>, value: Channel | null) => {
    if (!value || value === channel) return;
    setChannel(value);
    setCodeStep(false);
    setCode('');
    setStatus(null);
  };

  const sendCode = async (method: 'email' | PhoneMethod) => {
    if (!email.trim()) {
      setStatus({ ok: false, text: 'יש להזין את כתובת האימייל של החשבון.' });
      return;
    }
    setBusy(method);
    setStatus(null);
    try {
      const result = method === 'email'
        ? await postJson('/api/auth/forgot-password', { email })
        : await postJson('/api/auth/forgot-password-phone', { email, method });
      if (result.ok) {
        setCodeStep(true);
        // השרת מחזיר תמיד אותה הודעה כללית - כדי לא לחשוף אילו כתובות רשומות
        setStatus({ ok: true, text: result.message ?? 'אם החשבון קיים, נשלח אליו קוד לאיפוס.' });
      } else {
        setStatus({ ok: false, text: result.message ?? 'לא ניתן לשלוח את הקוד כרגע.' });
      }
    } catch {
      setStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    if (newPassword !== confirm) {
      setStatus({ ok: false, text: 'הסיסמאות אינן תואמות.' });
      return;
    }

    setBusy('reset');
    try {
      const result = channel === 'email'
        ? await postJson('/api/auth/reset-password', { token: code.trim(), newPassword })
        : await postJson('/api/auth/reset-password-phone', { email, code: code.trim(), newPassword });
      if (result.ok) {
        onDone(result.message ?? 'הסיסמה אופסה בהצלחה. אפשר להתחבר עם הסיסמה החדשה.');
      } else {
        setStatus({ ok: false, text: result.message ?? 'איפוס הסיסמה נכשל.' });
      }
    } catch {
      setStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={resetPassword}>
        <DialogTitle>{fromLink ? 'בחירת סיסמה חדשה' : 'איפוס סיסמה'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {!fromLink && (
              <ToggleButtonGroup value={channel} exclusive onChange={changeChannel} fullWidth color="primary" size="small">
                <ToggleButton value="email">קישור במייל</ToggleButton>
                <ToggleButton value="phone">קוד לטלפון</ToggleButton>
              </ToggleButtonGroup>
            )}

            {!fromLink && (
              <>
                {channel === 'phone' && (
                  <Typography variant="body2" color="text.secondary">
                    הקוד יישלח למספר הטלפון שאימתת בפרופיל.
                  </Typography>
                )}
                <TextField
                  label="כתובת אימייל"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={channel === 'phone'}   // בקוד מהמייל הקוד לבדו מזהה את החשבון
                  autoFocus={!email}
                />
                {channel === 'email' ? (
                  <Button
                    variant={codeStep ? 'outlined' : 'contained'}
                    disabled={busy !== null}
                    onClick={() => void sendCode('email')}
                  >
                    {busy === 'email' ? 'שולח...' : codeStep ? 'שליחה חוזרת' : 'שליחת קישור לאיפוס'}
                  </Button>
                ) : (
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      variant={codeStep ? 'outlined' : 'contained'}
                      fullWidth
                      disabled={busy !== null}
                      onClick={() => void sendCode('sms')}
                    >
                      {busy === 'sms' ? 'שולח...' : codeStep ? 'שוב במסרון' : 'קוד במסרון'}
                    </Button>
                    <Button variant="outlined" fullWidth disabled={busy !== null} onClick={() => void sendCode('call')}>
                      {busy === 'call' ? 'מתקשר...' : codeStep ? 'שוב בשיחה' : 'קוד בשיחה קולית'}
                    </Button>
                  </Stack>
                )}
                {!codeStep && channel === 'email' && (
                  <Link component="button" type="button" variant="body2" onClick={() => setCodeStep(true)} sx={{ alignSelf: 'center' }}>
                    כבר קיבלתי קוד במייל
                  </Link>
                )}
              </>
            )}

            {codeStep && (
              <>
                <TextField
                  label={channel === 'email' ? 'קוד האיפוס מהמייל' : 'הקוד שהגיע לטלפון'}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  slotProps={{
                    htmlInput: channel === 'phone'
                      ? { inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 20 }
                      : { maxLength: 200 },
                  }}
                />
                <TextField
                  label="סיסמה חדשה"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus={fromLink}
                  helperText="לפחות 8 תווים"
                  slotProps={{ htmlInput: { minLength: 8, maxLength: 100, autoComplete: 'new-password' } }}
                />
                <TextField
                  label="אימות סיסמה חדשה"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  slotProps={{ htmlInput: { autoComplete: 'new-password' } }}
                />
              </>
            )}

            {status && <Alert severity={status.ok ? 'success' : 'error'}>{status.text}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={busy !== null}>ביטול</Button>
          {codeStep && (
            <Button type="submit" variant="contained" disabled={busy !== null}>
              {busy === 'reset' ? 'מאפס...' : 'איפוס סיסמה'}
            </Button>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
