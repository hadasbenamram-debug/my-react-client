import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { readErrorMessage } from '../utils/apiError';
import type { RegionResponseDto } from '../types/api';

interface RegionOption {
  id: number;
  regionName?: string;
  name?: string;
}

// האורכים תואמים לעמודות במסד (השרת בודק את אותו דבר)
interface FieldDef { name: string; label: string; type?: string; maxLength?: number; minLength?: number; }

const userFields: FieldDef[] = [
  { name: 'name', label: 'שם מלא', minLength: 2, maxLength: 100 },
  { name: 'email', label: 'אימייל', type: 'email', maxLength: 254 },
  { name: 'phone', label: 'טלפון', type: 'tel', maxLength: 20 },
];

const ngoFields: FieldDef[] = [
  { name: 'ngoName', label: 'שם העמותה', minLength: 2, maxLength: 100 },
  { name: 'registrationNumber', label: 'מספר רישום (חברה/עמותה)', maxLength: 20 },
  // המיקום על המפה נקבע בשרת לפי הכתובת (Google Maps), ולכן צריך כתובת מלאה
  { name: 'address', label: 'כתובת מלאה (רחוב, מספר ועיר)', maxLength: 200 },
  { name: 'dailyCapacity', label: 'קיבולת יומית (ק"ג)', type: 'number' },
];

export function NgoRegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    ngoName: '',
    registrationNumber: '',
    address: '',
    dailyCapacity: 100,
    regionId: 1,
    // חדש: שעות קבלה (בעבר לא נשלחו, והעמותה נשמרה עם 00:00-00:00 - כלומר "סגורה תמיד")
    sunToThuOpenTime: '09:00',
    sunToThuCloseTime: '17:00',
    receivesOnFriday: false,
    fridayOpenTime: '',
    fridayCloseTime: '',
  });

  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // שליפת רשימת האזורים מהשרת בעת טעינת העמוד
  useEffect(() => {
    fetch('/api/region')
      .then((res) => res.json())
      .then((data: RegionResponseDto[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setRegions(data);
          setFormData((prev) => ({ ...prev, regionId: data[0].id }));
        }
      })
      .catch((err) => console.error('שגיאה בטעינת אזורים:', err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | { name?: string; value: unknown }>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (formData.sunToThuOpenTime >= formData.sunToThuCloseTime) {
      setMessage('שעת הפתיחה חייבת להיות לפני שעת הסגירה.');
      return;
    }
    if (formData.receivesOnFriday && (!formData.fridayOpenTime || !formData.fridayCloseTime || formData.fridayOpenTime >= formData.fridayCloseTime)) {
      setMessage('יש להזין שעות קבלה תקינות ליום שישי.');
      return;
    }

    setLoading(true);

    fetch('/api/ngos/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        dailyCapacity: Number(formData.dailyCapacity),
        regionId: Number(formData.regionId),
        sunToThuOpenTime: formData.sunToThuOpenTime + ':00',
        sunToThuCloseTime: formData.sunToThuCloseTime + ':00',
        fridayOpenTime: formData.receivesOnFriday && formData.fridayOpenTime ? formData.fridayOpenTime + ':00' : null,
        fridayCloseTime: formData.receivesOnFriday && formData.fridayCloseTime ? formData.fridayCloseTime + ':00' : null,
      }),
    })
      .then(async res => {
        setLoading(false);
        if (res.ok) {
          setMessage('רישום העמותה בוצע בהצלחה! סיסמה זמנית נשלחה למייל.');
        } else {
          setMessage(await readErrorMessage(res, 'אירעה שגיאה בעת הרישום. נסה שוב.'));
        }
      })
      .catch(err => {
        setLoading(false);
        setMessage('שגיאת תקשורת מול השרת.');
        console.error('שגיאת תקשורת:', err);
      });
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
      slotProps={{ htmlInput: { maxLength: f.maxLength, minLength: f.minLength, ...(f.type === 'number' ? { min: 1, max: 100000 } : {}) } }}
    />
  );

  const timeField = (name: string, label: string, required = true) => (
    <TextField
      key={name}
      name={name}
      label={label}
      type="time"
      value={(formData as Record<string, any>)[name]}
      onChange={handleChange}
      required={required}
      slotProps={{ inputLabel: { shrink: true } }}
    />
  );

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="הצטרפות"
        title="הרשמת עמותה חדשה"
        subtitle="עמותות ומוסדות שמקבלים תרומות מזון."
      />
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="פרטי משתמש">{userFields.map(renderField)}</FormSection>
          <Divider sx={{ my: 4 }} />
          <FormSection title="פרטי העמותה">
            {ngoFields.map(renderField)}
            
            {/* רשימה נפתחת לבחירת אזור פעילות מתוך השרת */}
            <TextField
              select
              name="regionId"
              label="אזור פעילות"
              value={formData.regionId}
              onChange={handleChange}
              required
            >
              {regions.map((reg) => (
                <MenuItem key={reg.id} value={reg.id}>
                  {reg.regionName || reg.name || `אזור ${reg.id}`}
                </MenuItem>
              ))}
            </TextField>
          </FormSection>

          <Divider sx={{ my: 4 }} />
          <FormSection title="שעות קבלת תרומות">
            {timeField('sunToThuOpenTime', 'א׳-ה׳ משעה')}
            {timeField('sunToThuCloseTime', 'א׳-ה׳ עד שעה')}
            <FormControlLabel
              control={<Switch name="receivesOnFriday" checked={formData.receivesOnFriday} onChange={handleChange} />}
              label="מקבלים תרומות גם ביום שישי"
            />
            {formData.receivesOnFriday && timeField('fridayOpenTime', 'שישי משעה')}
            {formData.receivesOnFriday && timeField('fridayCloseTime', 'שישי עד שעה')}
          </FormSection>

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'שולח לאישור...' : 'הירשם כעמותה'}
          </Button>
        </form>
        <StatusAlert message={message} success={message.includes('בהצלחה')} />
      </Card>
    </Box>
  );
}