import { useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import { useContactForm, type ContactFormData } from '../hooks/useContactForm';
import type { StoredUser } from '../types';

// אם המשתמש מחובר - ממלאים מראש שם ואימייל מתוך currentUser
function getLoggedInDefaults(): Partial<ContactFormData> {
  try {
    const stored = localStorage.getItem('currentUser');
    if (!stored) return {};
    const user = JSON.parse(stored) as StoredUser;
    const name = user.name ?? user.fullName;
    return {
      name: typeof name === 'string' ? name : '',
      email: typeof user.email === 'string' ? user.email : '',
    };
  } catch {
    return {};
  }
}

// עמוד צור קשר יחיד - משמש גם אורחים וגם משתמשים מחוברים (/contact)
export function ContactSupportPage() {
  const { form, onChange, onSubmit, loading, status } = useContactForm(getLoggedInDefaults());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="צור קשר" title="תמיכה וצור קשר" subtitle="יש לכם שאלה? כתבו לנו ונחזור אליכם בהקדם." />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={onSubmit}>
          <FormSection title="פרטי הפנייה">
            <TextField name="name" label="שם מלא" value={form.name} onChange={onChange} required
              slotProps={{ htmlInput: { maxLength: 100 } }} />
            <TextField name="email" label="אימייל ליצירת קשר" type="email" value={form.email} onChange={onChange} required />
            <TextField name="phone" label="טלפון (לא חובה)" type="tel" value={form.phone} onChange={onChange}
              slotProps={{ htmlInput: { maxLength: 20 } }} />
          </FormSection>

          <Box sx={{ display: 'grid', gap: 3, mt: 3 }}>
            <TextField name="subject" label="נושא הפנייה" value={form.subject} onChange={onChange} required
              slotProps={{ htmlInput: { maxLength: 150 } }} />
            <TextField
              name="message"
              label="תוכן ההודעה"
              multiline
              minRows={5}
              value={form.message}
              onChange={onChange}
              required
              slotProps={{ htmlInput: { maxLength: 1000 } }}
              helperText={`${form.message.length}/1000 תווים`}
            />
          </Box>

          <Button type="submit" variant="contained" size="large" disabled={loading} sx={{ mt: 3 }}>
            {loading ? 'שולח...' : 'שלח פנייה'}
          </Button>
        </form>
        <StatusAlert message={status?.text ?? ''} success={!!status?.ok} />
      </Card>
    </Box>
  );
}
