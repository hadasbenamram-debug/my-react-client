import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import { AddRoleNotice } from '../components/AddRoleNotice';
import { useAddRoleMode } from '../hooks/useAddRoleMode';
import { readErrorMessage } from '../utils/apiError';
import { authHeaders } from '../utils/auth';

// האורכים תואמים לעמודות במסד (בעבר שם העסק עד 150 ו-ח.פ עד 50, בזמן שהמסד מקבל 100 ו-20)
interface FieldDef { name: string; label: string; type?: string; maxLength?: number; minLength?: number; }

const userFields: FieldDef[] = [
  { name: 'name', label: 'שם מלא', minLength: 2, maxLength: 100 },
  { name: 'email', label: 'אימייל', type: 'email', maxLength: 254 },
  { name: 'phone', label: 'טלפון', type: 'tel', maxLength: 20 },
];

const businessFields: FieldDef[] = [
  { name: 'businessName', label: 'שם העסק', minLength: 2, maxLength: 100 },
  // המיקום על המפה נקבע בשרת לפי הכתובת (Google Maps), ולכן צריך כתובת מלאה
  { name: 'address', label: 'כתובת העסק המלאה (רחוב, מספר ועיר)', maxLength: 200 },
  { name: 'taxId', label: 'מספר ח.פ / תיק מע"מ', minLength: 5, maxLength: 20 },
];

const ALLOWED_LICENSE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_LICENSE_SIZE = 5 * 1024 * 1024;

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  businessName: '',
  address: '',
  taxId: '',
};

export function SupplierRegisterPage() {
  const [formData, setFormData] = useState(emptyForm);

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  // תיקון 10: משתמש מחובר (למשל מתנדב שיש לו עסק) מוסיף לחשבון שלו גם תפקיד ספק
  const { loggedIn, account, existing, blocked } = useAddRoleMode('Supplier');
  const [roleRequested, setRoleRequested] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuccess(false);

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
    setSuccess(false);

    // ה-input של הקובץ מוסתר, ולכן הדפדפן לא יכול להציג עליו הודעת required - בודקים כאן.
    if (!licenseFile) {
      setMessage('חובה לצרף קובץ רישיון עסק.');
      return;
    }

    setLoading(true);
    setMessage('');

    // שימוש ב-FormData לצורך שליחת קבצים וטקסט יחד לשרת
    const data = new FormData();
    if (!loggedIn) {
      data.append('Name', formData.name);
      data.append('Email', formData.email);
      data.append('Phone', formData.phone);
    }
    data.append('BusinessName', formData.businessName);
    data.append('Address', formData.address);
    data.append('TaxId', formData.taxId);
    data.append('LicenseFile', licenseFile);

    try {
      // מחוברים: התפקיד מצורף לחשבון הקיים (POST api/suppliers), אחרת - הרשמה חדשה
      const response = await fetch(loggedIn ? '/api/suppliers' : '/api/suppliers/register', {
        method: 'POST',
        // אין לציין 'Content-Type': 'application/json' משום שהדפדפן מגדיר זאת אוטומטית עבור FormData
        headers: loggedIn ? authHeaders() : undefined,
        body: data,
      });

      if (response.ok && loggedIn) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message || 'הבקשה נשלחה לאישור מנהל.');
        setSuccess(true);
        setRoleRequested(true);
      } else if (response.ok) {
        // השרת מחזיר אותה הודעה גם כשהמייל כבר רשום (כדי לא לחשוף אילו מיילים קיימים) - הפרטים נשלחים למייל
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message || 'הבקשה נקלטה. פרטי ההמשך נשלחו לכתובת המייל שהזנת.');
        setSuccess(true);
        setFormData(emptyForm);
        setLicenseFile(null);
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
        title={loggedIn ? 'הצטרפות גם כספק / תורם' : 'רישום ספק / תורם'}
        subtitle={loggedIn ? 'ממלאים רק את פרטי העסק - בלי חשבון חדש.' : 'עסקים ואירועים שרוצים לתרום עודפי מזון.'}
      />
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        {loggedIn && !roleRequested && <AddRoleNotice role="Supplier" account={account} existing={existing} />}
        {!(loggedIn && (blocked || roleRequested)) && (
        <form onSubmit={handleSubmit}>
          {!loggedIn && (
            <>
              <FormSection title="פרטי משתמש">{userFields.map(renderField)}</FormSection>
              <Divider sx={{ my: 4 }} />
            </>
          )}
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
            {loading ? 'שולח...' : loggedIn ? 'שליחת הבקשה לאישור' : 'הירשם כספק'}
          </Button>
        </form>
        )}
      <StatusAlert message={message} success={success} />
      </Card>
    </Box>
  );
}