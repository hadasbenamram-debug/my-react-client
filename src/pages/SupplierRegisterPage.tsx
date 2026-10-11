import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';

const userFields = [
  { name: 'name', label: 'שם מלא' },
  { name: 'email', label: 'אימייל', type: 'email' },
  { name: 'phone', label: 'טלפון' },
];

const businessFields = [
  { name: 'businessName', label: 'שם העסק' },
  { name: 'address', label: 'כתובת העסק' },
  { name: 'taxId', label: 'מספר ח.פ / תיק מע"מ' },
  { name: 'businessLicenseFilePath', label: 'נתיב קובץ רישיון עסק', placeholder: 'uploads/licenses/...' },
];

export function SupplierRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
    taxId: '',
    businessLicenseFilePath: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('רישום הספק בוצע בהצלחה! סיסמה זמנית נשלחה לכתובת האימייל שלך.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessage(errorData.message || 'אירעה שגיאה בעת הרישום. נסה שוב.');
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f: { name: string; label: string; type?: string; placeholder?: string }) => (
    <TextField
      key={f.name}
      name={f.name}
      label={f.label}
      type={f.type || 'text'}
      placeholder={f.placeholder}
      value={(formData as Record<string, any>)[f.name]}
      onChange={handleChange}
      required
      // כשיש placeholder התווית צריכה להישאר למעלה כדי לא לחפוף אותו
      slotProps={f.placeholder ? { inputLabel: { shrink: true } } : undefined}
    />
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="הצטרפות"
        title="רישום ספק / תורם"
        subtitle="עסקים ואירועים שרוצים לתרום עודפי מזון."
      />
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="פרטי משתמש">{userFields.map(renderField)}</FormSection>
          <Divider sx={{ my: 4 }} />
          <FormSection title="פרטי העסק">{businessFields.map(renderField)}</FormSection>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח...' : 'הירשם כספק'}
          </Button>
        </form>
        <StatusAlert message={message} />
      </Card>
    </Box>
  );
}
