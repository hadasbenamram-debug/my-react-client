import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection, StatusAlert } from '../components/FormParts.jsx';

const userFields = [
  { name: 'name', label: 'שם מלא' },
  { name: 'email', label: 'אימייל', type: 'email' },
  { name: 'phone', label: 'טלפון' },
];

const businessFields = [
  { name: 'businessName', label: 'שם העסק' },
  { name: 'address', label: 'כתובת העסק' },
  { name: 'taxId', label: 'מספר ח.פ / תיק מע"מ' },
];

export function SupplierRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    address: '',
    taxId: '',
  });

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLicenseFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // שימוש ב-FormData לצורך שליחת קבצים וטקסט יחד לשרת
    const data = new FormData();
    data.append('Name', formData.name);
    data.append('Email', formData.email);
    data.append('Phone', formData.phone);
    data.append('BusinessName', formData.businessName);
    data.append('Address', formData.address);
    data.append('TaxId', formData.taxId);
    
    if (licenseFile) {
      data.append('LicenseFile', licenseFile);
    }

    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        // אין לציין 'Content-Type': 'application/json' משום שהדפדפן מגדיר זאת אוטומטית עבור FormData
        body: data,
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

  const renderField = (f: { name: string; label: string; type?: string }) => (
    <TextField
      key={f.name}
      name={f.name}
      label={f.label}
      type={f.type || 'text'}
      value={(formData as Record<string, any>)[f.name]}
      onChange={handleChange}
      required
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
          <FormSection title="פרטי העסק">
            {businessFields.map(renderField)}

            {/* שדה בחירת קובץ רישיון עסק עם הגבלה לפורמטים מוכרים */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                קובץ רישיון עסק (PDF / תמונה בלבד) *
              </Typography>
              <Button variant="outlined" component="label">
                בחר קובץ
                <input 
                  type="file" 
                  hidden 
                  accept=".pdf,.jpg,.jpeg,.png" 
                  onChange={handleFileChange} 
                  required 
                />
              </Button>
              {licenseFile && (
                <Typography variant="caption" color="primary">
                  קובץ נבחר: {licenseFile.name}
                </Typography>
              )}
            </Box>
          </FormSection>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח...' : 'הירשם כספק'}
          </Button>
        </form>
      <StatusAlert message={message} success={message.includes('בהצלחה')} />
      </Card>
    </Box>
  );
}