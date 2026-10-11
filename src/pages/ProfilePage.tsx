import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';

const profileFields = [
  { name: 'firstName', label: 'שם פרטי' },
  { name: 'lastName', label: 'שם משפחה' },
  { name: 'email', label: 'אימייל', type: 'email' },
  { name: 'phoneNumber', label: 'טלפון' },
];

export function ProfilePage() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  // במקום alert() - הודעה מעוצבת מתחת לטופס הסיסמה
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordOk, setPasswordOk] = useState(false);

  // שליפת פרטי המשתמש בעת טעינת הדף
  useEffect(() => {
    // לדוגמה: שליפה מה-API
    // fetch('/api/users/profile')...
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
    setMessage('');

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setMessage('הפרופיל עודכן בהצלחה!');
      } else {
        setMessage('שגיאה בעדכון הפרופיל.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwords),
      });

      if (response.ok) {
        setPasswordOk(true);
        setPasswordMessage('הסיסמה שונתה בהצלחה!');
        setPasswords({ currentPassword: '', newPassword: '' });
      } else {
        setPasswordOk(false);
        setPasswordMessage('שגיאה בשינוי הסיסמה. בדוק את הנתונים.');
      }
    } catch (error) {
      setPasswordOk(false);
      setPasswordMessage('שגיאת תקשורת מול השרת.');
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="החשבון שלי" title="הפרופיל האישי שלי" />

      <Card sx={{ p: { xs: 3, md: 5 }, mb: 3 }}>
        <form onSubmit={handleUpdateProfile}>
          <FormSection title="פרטים אישיים">
            {profileFields.map((f) => (
              <TextField
                key={f.name}
                name={f.name}
                label={f.label}
                type={f.type || 'text'}
                value={(profile as Record<string, any>)[f.name]}
                onChange={handleProfileChange}
              />
            ))}
          </FormSection>
          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
            {loading ? 'מעדכן...' : 'שמור שינויים'}
          </Button>
        </form>
        <StatusAlert message={message} success={message.includes('בהצלחה')} />
      </Card>

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleChangePasswordSubmit}>
          <FormSection title="החלפת סיסמה">
            <TextField
              name="currentPassword"
              label="סיסמה נוכחית"
              type="password"
              value={passwords.currentPassword}
              onChange={handlePasswordChange}
              required
            />
            <TextField
              name="newPassword"
              label="סיסמה חדשה"
              type="password"
              value={passwords.newPassword}
              onChange={handlePasswordChange}
              required
            />
          </FormSection>
          <Divider sx={{ mt: 3, mb: 0, borderColor: 'transparent' }} />
          <Button type="submit" variant="outlined" size="large" sx={{ mt: 1 }}>
            שנה סיסמה
          </Button>
        </form>
        <StatusAlert message={passwordMessage} success={passwordOk} />
      </Card>
    </Box>
  );
}
