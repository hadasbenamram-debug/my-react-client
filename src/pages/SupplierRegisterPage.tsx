import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import { readErrorMessage } from '../utils/apiError';

// האורכים תואמים לעמודות במסד (בעבר שם העסק עד 150 ו-ח.פ עד 50, בזמן שהמסד מקבל 100 ו-20)
interface FieldDef { name: string; label: string; type?: string; maxLength?: number; minLength?: number; }

const userFields: FieldDef[] = [
  { name: 'name', label: 'שם מלא', minLength: 2, maxLength: 100 },
  { name: 'email', label: 'אימייל', type: 'email', maxLength: 254 },
  { name: 'phone', label: 'טלפון', type: 'tel', maxLength: 20 },
];

const businessFields: FieldDef[] = [
  { name: 'businessName', label: 'שם העסק', minLength: 2, maxLength: 100 },
  { name: 'address', label: 'כתובת העסק', maxLength: 200 },
  { name: 'taxId', label: 'מספר ח.פ / תיק מע"מ', minLength: 5, maxLength: 20 },
];

const ALLOWED_LICENSE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_LICENSE_SIZE = 5 * 1024 * 1024;

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
    const file = e.target.files?.[0];
    if (!file) return;

    // בדיקה מקדימה בצד הלקוח (השרת בודק שוב: סיומת, גודל ותוכן הקובץ)
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_LICENSE_EXTENSIONS.includes(extension)) {
      setLicenseFile(null);
      setMessage('יש להעלות קובץ PDF או תמונה (jpg, jpeg, png) בלבד.');
      return;
    }
    if (file.size > MAX_LICENSE_SIZE) {
      setLicenseFile(null);
      setMessage('גודל קובץ הרישיון המרבי הוא 5MB.');
      return;
    }

    setMessage('');
    setLicenseFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ה-input של הקובץ מוסתר, ולכן הדפדפן לא יכול להציג עליו הודעת required - בודקים כאן.
    if (!licenseFile) {
      setMessage('חובה לצרף קובץ רישיון עסק.');
      return;
    }

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
    data.append('LicenseFile', licenseFile);

    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        // אין לציין 'Content-Type': 'application/json' משום שהדפדפן מגדיר זאת אוטומטית עבור FormData
        body: data,
      });

      if (response.ok) {
        setMessage('רישום הספק בוצע בהצלחה! סיסמה זמנית נשלחה לכתובת האימייל שלך.');
      } else {
        setMessage(await readErrorMessage(response, 'אירעה שגיאה בעת הרישום. נסה שוב.'));
      }
    } catch (error) {
      setMessage('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f: FieldDef) => (
    <TextField
      key={f.name}
      name={f.name}
      label={f.label}
      type={f.type || 'text'}
      value={(formData as Record<string, any>)[f.name]}
      onChange={handleChange}
      required
      slotProps={{ htmlInput: { maxLength: f.maxLength, minLength: f.minLength } }}
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