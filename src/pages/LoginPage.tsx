import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';

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

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage('התחברת בהצלחה!');
        
        localStorage.setItem('token', data.token);

        const user = data.user ? data.user : { email, role: data.role || 'volunteer' };
        localStorage.setItem('currentUser', JSON.stringify(user));

        // אחרי התחברות - מעבר ישיר לדשבורד לפי התפקיד (מסך הבית נשאר זמין בכתובת "/")
        const role = String(user.role || user.type || '').toLowerCase();
        let target = '/';
        if (role === 'admin') target = '/app/admin/dashboard';
        else if (role.includes('volunt')) target = '/app/volunteer/dashboard';
        else if (role.includes('suppl') || role.includes('business')) target = '/app/supplier/dashboard';
        else if (role.includes('ngo') || role.includes('org')) target = '/app/ngo/dashboard';

        setTimeout(() => {
          window.location.href = target;
        }, 1000);

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

      const data = await response.json();

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