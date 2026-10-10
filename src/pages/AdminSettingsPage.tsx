import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection } from '../components/FormParts.jsx';
import { LoadingBlock } from '../components/PageParts.jsx';

export function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    matchingTimeoutMinutes: 30,
    distanceWeight: 0.5,
    urgencyWeight: 0.5
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // תיקון הכתובת לשרת ה-Backend המלא
    fetch('https://localhost:7295/api/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`שגיאת שרת: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setSettings(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הגדרות מערכת:', err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: Number(value) }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    // תיקון הכתובת גם בשמירה
    fetch('https://localhost:7295/api/settings', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(settings)
    })
      .then(res => {
        if (res.ok) {
          alert('הגדרות המערכת עודכנו בהצלחה!');
        } else {
          alert('שגיאה בשמירת ההגדרות.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען הגדרות מערכת..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="הגדרות מערכת"
        subtitle="ניהול פרמטרים גלובליים למנוע השידוכים, זמני טיימאאוט ומשקלים."
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSave}>
          <FormSection title="פרמטרים של מנוע השידוכים" columns={1}>
            <TextField
              label="טיימאאוט לאישור שיבוץ (דקות)"
              type="number"
              name="matchingTimeoutMinutes"
              value={settings.matchingTimeoutMinutes}
              onChange={handleChange}
              helperText="כמה זמן המתנדב מקבל כדי לאשר שיבוץ"
            />
            <TextField
              label="משקל מרחק בחישוב הציון"
              type="number"
              name="distanceWeight"
              value={settings.distanceWeight}
              onChange={handleChange}
              slotProps={{ htmlInput: { step: 0.1 } }}
            />
            <TextField
              label="משקל דחיפות המזון בחישוב הציון"
              type="number"
              name="urgencyWeight"
              value={settings.urgencyWeight}
              onChange={handleChange}
              slotProps={{ htmlInput: { step: 0.1 } }}
            />
          </FormSection>
          <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 4 }}>
            שמור הגדרות
          </Button>
        </form>
      </Card>
    </Box>
  );
}