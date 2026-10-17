import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import { authHeaders, getCurrentUser, homePathForRole, saveSession } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import type { ChangePasswordResponse, MyProfileDto } from '../types/api';

type Status = { ok: boolean; text: string } | null;
type Channel = 'email' | 'phone';

export function ProfilePage() {
  const mustChangeFromUrl = new URLSearchParams(window.location.search).get('mustChange') === '1';

  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [verified, setVerified] = useState({ email: false, phone: false });
  const [mustChange, setMustChange] = useState(mustChangeFromUrl || getCurrentUser().mustChangePassword === true);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [codes, setCodes] = useState<Record<Channel, string>>({ email: '', phone: '' });
  const [codeSent, setCodeSent] = useState<Record<Channel, boolean>>({ email: false, phone: false });

  const [loading, setLoading] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [verifyStatus, setVerifyStatus] = useState<Status>(null);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/users/me', { headers: authHeaders() });
      if (!response.ok) {
        setProfileStatus({ ok: false, text: await readErrorMessage(response, 'לא ניתן לטעון את הפרופיל.') });
        return;
      }
      const data = (await response.json()) as MyProfileDto;
      setProfile({ name: data.name ?? '', email: data.email ?? '', phone: data.phone ?? '' });
      setVerified({ email: data.isEmailVerified, phone: data.isPhoneVerified });
      setMustChange(data.mustChangePassword);
    } catch {
      setProfileStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswords({ ...passwords, [name]: value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setProfileStatus(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({ name: profile.name, phone: profile.phone }),
      });

      if (response.ok) {
        const data = (await response.json()) as MyProfileDto;
        setVerified({ email: data.isEmailVerified, phone: data.isPhoneVerified });
        setProfileStatus({ ok: true, text: 'הפרופיל עודכן בהצלחה!' });
        try {
          const stored = JSON.parse(localStorage.getItem('currentUser') ?? '{}');
          localStorage.setItem('currentUser', JSON.stringify({ ...stored, name: profile.name }));
        } catch { /* לא קריטי */ }
      } else {
        setProfileStatus({ ok: false, text: await readErrorMessage(response, 'שגיאה בעדכון הפרופיל.') });
      }
    } catch {
      setProfileStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordStatus({ ok: false, text: 'הסיסמאות החדשות אינן תואמות.' });
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });

      if (response.ok) {
        // כל הטוקנים הקודמים בוטלו - שומרים את הטוקן החדש שהשרת החזיר
        const data = (await response.json()) as ChangePasswordResponse;
        if (data.token && data.role) {
          saveSession({ token: data.token, role: data.role, mustChangePassword: false });
        }
        setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });

        if (mustChange) {
          setPasswordStatus({ ok: true, text: 'הסיסמה נקבעה בהצלחה! מעבירים אותך למערכת...' });
          setTimeout(() => { window.location.href = homePathForRole(data.role); }, 1000);
        } else {
          setPasswordStatus({ ok: true, text: 'הסיסמה שונתה בהצלחה. החיבורים בשאר המכשירים נותקו.' });
        }
        setMustChange(false);
      } else {
        setPasswordStatus({ ok: false, text: await readErrorMessage(response, 'שגיאה בשינוי הסיסמה.') });
      }
    } catch {
      setPasswordStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // חדש: אימות מייל וטלפון (SMS) בקוד חד-פעמי
  const sendCode = async (channel: Channel) => {
    setVerifyStatus(null);
    const response = await fetch(`/api/auth/send-${channel}-verification`, { method: 'POST', headers: authHeaders() });
    if (response.ok) {
      setCodeSent({ ...codeSent, [channel]: true });
      setVerifyStatus({ ok: true, text: channel === 'email' ? 'קוד נשלח למייל.' : 'קוד נשלח במסרון.' });
    } else {
      setVerifyStatus({ ok: false, text: await readErrorMessage(response, 'לא ניתן לשלוח קוד כרגע.') });
    }
  };

  const verifyCode = async (channel: Channel) => {
    setVerifyStatus(null);
    const response = await fetch(`/api/auth/verify-${channel}`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ code: codes[channel] }),
    });
    if (response.ok) {
      setVerified({ ...verified, [channel]: true });
      setCodeSent({ ...codeSent, [channel]: false });
      setCodes({ ...codes, [channel]: '' });
      setVerifyStatus({ ok: true, text: channel === 'email' ? 'המייל אומת בהצלחה!' : 'הטלפון אומת בהצלחה!' });
    } else {
      setVerifyStatus({ ok: false, text: await readErrorMessage(response, 'הקוד שגוי או שפג תוקפו.') });
    }
  };

  const verificationRow = (channel: Channel, label: string) => (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, py: 1 }}>
      <Typography sx={{ minWidth: 80, fontWeight: 500 }}>{label}</Typography>
      {verified[channel] ? (
        <Chip color="success" label="מאומת" />
      ) : (
        <>
          <Chip variant="outlined" label="לא מאומת" />
          <Button size="small" variant="outlined" onClick={() => void sendCode(channel)}>
            {codeSent[channel] ? 'שלח שוב' : 'שלח קוד'}
          </Button>
          {codeSent[channel] && (
            <>
              <TextField size="small" label="קוד" value={codes[channel]}
                onChange={(e) => setCodes({ ...codes, [channel]: e.target.value })}
                slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 6 } }} />
              <Button size="small" variant="contained" disabled={codes[channel].length !== 6} onClick={() => void verifyCode(channel)}>
                אמת
              </Button>
            </>
          )}
        </>
      )}
    </Stack>
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="החשבון שלי" title="הפרופיל האישי שלי" />

      {mustChange && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          נכנסת עם הסיסמה הזמנית שנשלחה אליך במייל. יש לבחור סיסמה חדשה כדי להמשיך להשתמש במערכת.
        </Alert>
      )}

      <Card sx={{ p: { xs: 3, md: 5 }, mb: 3 }}>
        <form onSubmit={handleChangePasswordSubmit}>
          <FormSection title={mustChange ? 'בחירת סיסמה חדשה' : 'החלפת סיסמה'}>
            <TextField name="currentPassword" label={mustChange ? 'הסיסמה הזמנית מהמייל' : 'סיסמה נוכחית'} type="password"
              value={passwords.currentPassword} onChange={handlePasswordChange} required />
            <TextField name="newPassword" label="סיסמה חדשה" type="password"
              value={passwords.newPassword} onChange={handlePasswordChange} required
              helperText="לפחות 8 תווים" slotProps={{ htmlInput: { minLength: 8, maxLength: 100 } }} />
            <TextField name="confirmPassword" label="אימות סיסמה חדשה" type="password"
              value={passwords.confirmPassword} onChange={handlePasswordChange} required />
          </FormSection>
          <Button type="submit" variant={mustChange ? 'contained' : 'outlined'} size="large" disabled={passwordLoading} sx={{ mt: 3 }}>
            {passwordLoading ? 'שומר...' : mustChange ? 'קבע סיסמה' : 'שנה סיסמה'}
          </Button>
        </form>
        <StatusAlert message={passwordStatus?.text ?? ''} success={!!passwordStatus?.ok} />
      </Card>

      {!mustChange && (
        <>
          <Card sx={{ p: { xs: 3, md: 5 }, mb: 3 }}>
            <form onSubmit={handleUpdateProfile}>
              <FormSection title="פרטים אישיים">
                <TextField name="name" label="שם מלא" value={profile.name} onChange={handleProfileChange} required
                  slotProps={{ htmlInput: { minLength: 2, maxLength: 100 } }} />
                <TextField name="phone" label="טלפון" type="tel" value={profile.phone} onChange={handleProfileChange} required
                  helperText="שינוי מספר מבטל את אימות הטלפון" slotProps={{ htmlInput: { maxLength: 20 } }} />
                <TextField name="email" label="אימייל" value={profile.email} disabled
                  helperText="האימייל משמש להתחברות ואינו ניתן לשינוי מכאן" />
              </FormSection>
              <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
                {loading ? 'מעדכן...' : 'שמור שינויים'}
              </Button>
            </form>
            <StatusAlert message={profileStatus?.text ?? ''} success={!!profileStatus?.ok} />
          </Card>

          <Card sx={{ p: { xs: 3, md: 5 } }}>
            <Typography variant="h6" sx={{ mb: 1 }}>אימות פרטי קשר</Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              טלפון מאומת מאפשר לקבל בקשות התנדבות גם במסרון.
            </Typography>
            {verificationRow('email', 'אימייל')}
            {verificationRow('phone', 'טלפון')}
            <StatusAlert message={verifyStatus?.text ?? ''} success={!!verifyStatus?.ok} />
          </Card>
        </>
      )}
    </Box>
  );
}
