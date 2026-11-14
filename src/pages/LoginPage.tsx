import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useSearchParams } from 'react-router-dom';
import PageTitle from '../components/PageTitle';
import PasswordResetDialog from '../components/PasswordResetDialog';
import type { ApiErrorBody, AuthResponseDto } from '../types/api';
import { homePathForRole, saveSession } from '../utils/auth';

// ?returnTo=/app/... - רק כתובת פנימית של האפליקציה (לא כתובת חיצונית)
const safeReturnTo = (): string | null => {
  const value = new URLSearchParams(window.location.search).get('returnTo');
  return value && value.startsWith('/app/') ? value : null;
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  // תיקון 69: איפוס סיסמה בחלון. ?reset=<קוד> - הגיעו מהקישור שבמייל; ?forgot=1 - מהכתובת הישנה של "שכחתי סיסמה"
  const [searchParams, setSearchParams] = useSearchParams();
  const resetToken = searchParams.get('reset');
  const [resetOpen, setResetOpen] = useState(() => !!resetToken || searchParams.get('forgot') === '1');

  const closeReset = () => {
    setResetOpen(false);
    // שלא ייפתח שוב ברענון
    if (searchParams.has('reset') || searchParams.has('forgot')) {
      const next = new URLSearchParams(searchParams);
      next.delete('reset');
      next.delete('forgot');
      setSearchParams(next, { replace: true });
    }
  };

  const handleResetDone = (text: string) => {
    closeReset();
    setPassword('');
    setIsSuccess(true);
    setMessage(text);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // בהצלחה: AuthResponseDto. בכישלון: { status, message, code }
      const data: AuthResponseDto & ApiErrorBody = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        saveSession(data, email);

        // חדש: משתמש שנרשם קיבל סיסמה זמנית במייל - חייב להחליף אותה לפני שימוש במערכת
        if (data.mustChangePassword) {
          setMessage('התחברת עם סיסמה זמנית. יש לבחור סיסמה חדשה.');
          setTimeout(() => { window.location.href = '/app/profile?mustChange=1'; }, 800);
          return;
        }

        setMessage('התחברת בהצלחה!');
        // אחרי התחברות - מעבר ישיר לדשבורד לפי התפקיד, או למסך שממנו הגיעו (למשל המסלול שאושר מהקישור)
        const target = safeReturnTo() ?? homePathForRole(data.role);
        setTimeout(() => {
          window.location.href = target;
        }, 800);

      } else {
        setMessage(data.message || 'שגיאה בפרטי ההתחברות');
      }
    } catch (error) {
      setMessage('לא ניתן להתחבר לשרת');
    }
  };

  const messageAlert = message ? (
    <Alert severity={isSuccess ? 'success' : 'error'} sx={{ mt: 3 }}>
      {message}
    </Alert>
  ) : null;

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto' }}>
      <PageTitle title="התחברות" />
      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <form onSubmit={handleLogin}>
          <Stack spacing={3}>
            <TextField
              label="מייל"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label="סיסמה"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Typography variant="body2">
              <Button
                type="button"
                variant="text"
                size="small"
                sx={{ p: 0, minWidth: 0, color: 'text.secondary', textDecoration: 'underline' }}
                onClick={() => { setResetOpen(true); setMessage(''); }}
              >
                שכחת סיסמה?
              </Button>
            </Typography>
            <Button type="submit" variant="contained" size="large" disabled={!email || !password}>
              התחבר
            </Button>
          </Stack>
        </form>
        {messageAlert}
      </Card>
      <PasswordResetDialog
        open={resetOpen}
        initialEmail={email}
        initialToken={resetToken}
        onClose={closeReset}
        onDone={handleResetDone}
      />
    </Box>
  );
};