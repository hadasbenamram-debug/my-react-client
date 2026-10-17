import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import { readErrorMessage } from '../utils/apiError';

// הגדרת השדות במקום אחד - קל להוסיף/להסיר שדה
// האורכים תואמים לעמודות במסד (השרת בודק את אותו דבר)
interface FieldDef { name: string; label: string; type?: string; maxLength?: number; minLength?: number; helperText?: string; }

const userFields: FieldDef[] = [
  { name: 'name', label: 'שם מלא', minLength: 2, maxLength: 100 },
  { name: 'email', label: 'אימייל', type: 'email', maxLength: 254 },
  { name: 'phone', label: 'טלפון', type: 'tel', maxLength: 20 },
];

const volunteerFields: FieldDef[] = [
  { name: 'vehicleType', label: 'סוג רכב', maxLength: 50 },
  { name: 'maxCapacityKg', label: 'קיבולת מקסימלית (ק"ג)', type: 'number' },
  { name: 'idNumber', label: 'תעודת זהות', minLength: 5, maxLength: 9, helperText: '9 ספרות כולל ספרת ביקורת' },
  { name: 'driverLicenseNumber', label: 'מספר רישיון נהיגה', minLength: 5, maxLength: 20 },
  { name: 'driverLicenseExpiry', label: 'תוקף רישיון הנהיגה', type: 'date' },
  { name: 'dateOfBirth', label: 'תאריך לידה', type: 'date', helperText: 'גיל 17 ומעלה' },
];

// ספרת ביקורת של תעודת זהות ישראלית (אותו אלגוריתם כמו בשרת)
const isValidIsraeliId = (value: string): boolean => {
  const id = value.trim();
  if (!/^\d{5,9}$/.test(id)) return false;
  const padded = id.padStart(9, '0');
  if (padded === '000000000') return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let step = Number(padded[i]) * ((i % 2) + 1);
    if (step > 9) step -= 9;
    sum += step;
  }
  return sum % 10 === 0;
};

export function VolunteerRegisterPage() {
  const [formData, setFormData] = useState({
    name: '', // במקום firstName ו-lastName, או התאם לפי ה-DTO בשרת
    email: '',
    phone: '', // במקום phoneNumber
    vehicleType: '',
    maxCapacityKg: '',
    idNumber: '',
    driverLicenseNumber: '',
    driverLicenseExpiry: '',
    dateOfBirth: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');

    if (!isValidIsraeliId(formData.idNumber)) {
      setMessage('מספר תעודת הזהות אינו תקין (ספרת ביקורת).');
      return;
    }
    if (formData.driverLicenseExpiry && new Date(formData.driverLicenseExpiry) < new Date(new Date().toDateString())) {
      setMessage('תוקף רישיון הנהיגה עבר. לא ניתן להירשם עם רישיון לא בתוקף.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/volunteers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          maxCapacityKg: Number(formData.maxCapacityKg),
        }),
      });

      if (response.ok) {
        setMessage('הרישום בוצע בהצלחה! סיסמה זמנית נשלחה לכתובת האימייל שלך.');
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
      helperText={f.helperText}
      // בשדה תאריך התווית חייבת להישאר למעלה
      slotProps={{
        inputLabel: f.type === 'date' ? { shrink: true } : undefined,
        htmlInput: { maxLength: f.maxLength, minLength: f.minLength, ...(f.type === 'number' ? { min: 1, max: 5000 } : {}) },
      }}
    />
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="הצטרפות"
        title="רישום מתנדב"
        subtitle="מלאו את הפרטים ונשלח אליכם סיסמה זמנית למייל."
      />
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="פרטי משתמש">{userFields.map(renderField)}</FormSection>
          <Divider sx={{ my: 4 }} />
          <FormSection title="פרטי התנדבות ורכב">{volunteerFields.map(renderField)}</FormSection>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח...' : 'הירשם כמתנדב'}
          </Button>
        </form>
        <StatusAlert message={message} />
      </Card>
    </Box>
  );
}
