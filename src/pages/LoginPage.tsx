import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import type { ApiErrorBody, AuthResponseDto } from '../types/api';
import { homePathForRole, saveSession } from '../utils/auth';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

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
        // אחרי התחברות - מעבר ישיר לדשבורד לפי התפקיד
        const target = homePathForRole(data.role);
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsSuccess(false);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data: ApiErrorBody = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage(data.message || 'קוד איפוס נשלח בהצלחה למייל שלך!');
      } else {
        setMessage(data.message || 'שגיאה בשליחת בקשת האיפוס');
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

  if (isForgotPassword) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto' }}>
        <PageTitle title="שכחת סיסמה" />
        <Card sx={{ p: { xs: 3, md: 4 } }}>
          <form onSubmit={handleResetPassword}>
            <Stack spacing={3}>
              <TextField
                label="מייל"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" variant="contained" disabled={!email}>
                שלח קישור לאיפוס
              </Button>
              <Button
                type="button"
                variant="text"
                onClick={() => { setIsForgotPassword(false); setMessage(''); }}
              >
                חזרה להתחברות
              </Button>
            </Stack>
          </form>
          {messageAlert}
        </Card>
      </Box>
    );
  }

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
                onClick={() => { setIsForgotPassword(true); setMessage(''); }}
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
    </Box>
  );
};