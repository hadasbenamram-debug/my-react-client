import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { StatusAlert } from '../components/FormParts';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);

      // השרת מחזיר תמיד אותה הודעה כללית (גם אם המייל לא קיים) - כדי לא לחשוף אילו כתובות רשומות
      if (response.ok) {
        setStatus({ ok: true, text: body?.message ?? 'אם הכתובת קיימת במערכת, נשלח אליה קישור לאיפוס.' });
      } else {
        setStatus({ ok: false, text: body?.message ?? 'אירעה שגיאה. נסו שוב.' });
      }
    } catch {
      setStatus({ ok: false, text: 'אין תקשורת עם השרת.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <PageTitle eyebrow="איפוס סיסמה" title="שחזור סיסמה" />
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              label="כתובת אימייל"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'שולח...' : 'שלח קישור איפוס'}
            </Button>
          </Stack>
        </form>
        <StatusAlert message={status?.text ?? ''} success={!!status?.ok} />
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Link component={RouterLink} to="/app/reset-password">כבר קיבלתי קוד במייל</Link>
        </Box>
      </Card>
    </Box>
  );
}
