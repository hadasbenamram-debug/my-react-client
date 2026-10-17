import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { StatusAlert } from '../components/FormParts';

// /app/reset-password?token=...  - לכאן מוביל הקישור שבמייל.
// אפשר גם להיכנס בלי token בכתובת ולהדביק את הקוד מהמייל ידנית.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    if (newPassword !== confirm) {
      setStatus({ ok: false, text: 'הסיסמאות אינן תואמות.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const body = await response.json().catch(() => null);
      const firstError = body?.errors ? Object.values(body.errors as Record<string, string[]>)[0]?.[0] : null;

      if (response.ok) {
        setStatus({ ok: true, text: body?.message ?? 'הסיסמה אופסה בהצלחה.' });
        setNewPassword('');
        setConfirm('');
      } else {
        setStatus({ ok: false, text: firstError || body?.message || 'איפוס הסיסמה נכשל.' });
      }
    } catch {
      setStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <PageTitle eyebrow="איפוס סיסמה" title="בחירת סיסמה חדשה" />
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="קוד האיפוס מהמייל"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
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
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'מאפס...' : 'איפוס סיסמה'}
            </Button>
          </Stack>
        </form>
        <StatusAlert message={status?.text ?? ''} success={!!status?.ok} />
        {status?.ok && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/app/login">למעבר להתחברות</Link>
          </Box>
        )}
      </Card>
    </Box>
  );
}
