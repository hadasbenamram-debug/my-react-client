import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle.jsx';
import { StatusAlert } from '../components/FormParts.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setMessage('קישור/קוד לאיפוס סיסמה נשלח למייל שלך בהצלחה.');
      } else {
        setMessage('אירעה שגיאה. ודא שהכתובת קיימת במערכת.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
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
        <StatusAlert message={message} />
      </Card>
    </Box>
  );
}
