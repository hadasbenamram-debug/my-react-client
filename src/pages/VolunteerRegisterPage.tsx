import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection, StatusAlert } from '../components/FormParts.jsx';

// הגדרת השדות במקום אחד - קל להוסיף/להסיר שדה
const userFields = [
  { name: 'name', label: 'שם מלא' },
  { name: 'email', label: 'אימייל', type: 'email' },
  { name: 'phone', label: 'טלפון' },
];

const volunteerFields = [
  { name: 'vehicleType', label: 'סוג רכב' },
  { name: 'maxCapacityKg', label: 'קיבולת מקסימלית (ק"ג)', type: 'number' },
  { name: 'idNumber', label: 'תעודת זהות' },
  { name: 'driverLicenseNumber', label: 'מספר רישיון נהיגה' },
  { name: 'dateOfBirth', label: 'תאריך לידה', type: 'date' },
];

export function VolunteerRegisterPage() {
  const [formData, setFormData] = useState({
    name: '', // במקום firstName ו-lastName, או התאם לפי ה-DTO בשרת
    email: '',
    phone: '', // במקום phoneNumber
    vehicleType: '',
    maxCapacityKg: '',
    idNumber: '',
    driverLicenseNumber: '',
    dateOfBirth: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

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
      // בשדה תאריך התווית חייבת להישאר למעלה
      slotProps={f.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
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
