import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';

export function ContactSupportPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponseMessage('');

    try {
      const response = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setResponseMessage('הפנייה נשלחה בהצלחה! צוות התמיכה יחזור אליך בהקדם.');
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        setResponseMessage('אירעה שגיאה בשליחת הפנייה. נסה שוב.');
      }
    } catch (error) {
      setResponseMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="תמיכה" title="תמיכה וצור קשר" subtitle="נשמח לעזור. כתבו לנו ונחזור אליכם בהקדם." />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="פרטי הפנייה">
            <TextField name="name" label="שם מלא" value={formData.name} onChange={handleChange} required />
            <TextField
              name="email"
              label="אימייל ליצירת קשר"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </FormSection>

          <Box sx={{ display: 'grid', gap: 3, mt: 3 }}>
            <TextField name="subject" label="נושא הפנייה" value={formData.subject} onChange={handleChange} required />
            <TextField
              name="message"
              label="תוכן ההודעה"
              multiline
              minRows={5}
              value={formData.message}
              onChange={handleChange}
              required
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={`${formData.message.length}/1000 תווים`}
            />
          </Box>

          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
            {loading ? 'שולח...' : 'שלח פנייה'}
          </Button>
        </form>
        <StatusAlert message={responseMessage} success={responseMessage.includes('בהצלחה')} />
      </Card>
    </Box>
  );
}
