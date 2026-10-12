import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection, StatusAlert } from '../components/FormParts.jsx';

const timeField = { inputLabel: { shrink: true } };

export function NgoWorkingHoursPage() {
  const [workingHours, setWorkingHours] = useState({
    address: 'בורוכוב 12',
    latitude: 32.0853,
    longitude: 34.7818,
    sunToThuOpenTime: '09:00',
    sunToThuCloseTime: '17:00',
    receivesOnFriday: false,
    fridayOpenTime: '09:00',
    fridayCloseTime: '13:00'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // תפיסת הטוקן מה-URL ושמירתו ב-localStorage
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    // בדיקת הגבלה לשעת סגירה ביום שישי עד 16:00
    if (workingHours.receivesOnFriday && workingHours.fridayCloseTime) {
      if (workingHours.fridayCloseTime > '16:00') {
        setError('שעת הסגירה ביום שישי אינה יכולה להיות מאוחרת מהשעה 16:00.');
        setLoading(false);
        return;
      }
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא פתח את הקישור מחדש מהמייל.');
      setLoading(false);
      return;
    }

    const payload = {
      address: workingHours.address,
      latitude: Number(workingHours.latitude),
      longitude: Number(workingHours.longitude),
      sunToThuOpenTime: workingHours.sunToThuOpenTime.length === 5 ? `${workingHours.sunToThuOpenTime}:00` : workingHours.sunToThuOpenTime,
      sunToThuCloseTime: workingHours.sunToThuCloseTime.length === 5 ? `${workingHours.sunToThuCloseTime}:00` : workingHours.sunToThuCloseTime,
      receivesOnFriday: workingHours.receivesOnFriday,
      fridayOpenTime: workingHours.receivesOnFriday ? (workingHours.fridayOpenTime.length === 5 ? `${workingHours.fridayOpenTime}:00` : workingHours.fridayOpenTime) : null,
      fridayCloseTime: workingHours.receivesOnFriday ? (workingHours.fridayCloseTime.length === 5 ? `${workingHours.fridayCloseTime}:00` : workingHours.fridayCloseTime) : null
    };

    try {
      await axios.put('https://localhost:7295/api/ngos/my-hours', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      setSuccessMessage('שעות הקבלה והמיקום עודכנו בהצלחה!');
    } catch (err: any) {
      console.error('שגיאה בעדכון הנתונים:', err);
      setError(err.response?.data?.message || 'שגיאה בעדכון הנתונים מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="עמותה"
        title="מיקום ושעות קבלה"
        subtitle="הגדירו מתי ואיפה אפשר למסור לכם תרומות."
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="מיקום" columns={1}>
            <TextField
              label="כתובת מדויקת"
              value={workingHours.address}
              onChange={(e) => setWorkingHours({ ...workingHours, address: e.target.value })}
              required
            />
          </FormSection>

          <Box sx={{ mt: 4 }}>
            <FormSection title="שעות קבלה (ראשון עד חמישי)">
              <TextField
                label="שעת פתיחה"
                type="time"
                value={workingHours.sunToThuOpenTime}
                onChange={(e) => setWorkingHours({ ...workingHours, sunToThuOpenTime: e.target.value })}
                slotProps={timeField}
                required
              />
              <TextField
                label="שעת סגירה"
                type="time"
                value={workingHours.sunToThuCloseTime}
                onChange={(e) => setWorkingHours({ ...workingHours, sunToThuCloseTime: e.target.value })}
                slotProps={timeField}
                required
              />
            </FormSection>
          </Box>

          <Box sx={{ mt: 4 }}>
            <FormControlLabel
              control={
                <Switch
                  color="primary"
                  checked={workingHours.receivesOnFriday}
                  onChange={(e) => setWorkingHours({ ...workingHours, receivesOnFriday: e.target.checked })}
                />
              }
              label="מקבלים בימי שישי"
            />
          </Box>

          {workingHours.receivesOnFriday && (
            <Box sx={{ mt: 2 }}>
              <FormSection title="שעות קבלה (יום שישי)">
                <TextField
                  label="שעת פתיחה"
                  type="time"
                  value={workingHours.fridayOpenTime}
                  onChange={(e) => setWorkingHours({ ...workingHours, fridayOpenTime: e.target.value })}
                  slotProps={timeField}
                />
                <TextField
                  label="שעת סגירה"
                  type="time"
                  value={workingHours.fridayCloseTime}
                  onChange={(e) => {
                    setError(null);
                    setWorkingHours({ ...workingHours, fridayCloseTime: e.target.value });
                  }}
                  slotProps={{
                    htmlInput: { max: '16:00' },
                    inputLabel: { shrink: true }
                  }}
                />
              </FormSection>
            </Box>
          )}

          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
            {loading ? 'מעדכן...' : 'שמור שעות ומיקום'}
          </Button>
        </form>

        {error && <StatusAlert message={error} success={false} />}
        {successMessage && <StatusAlert message={successMessage} success />}
      </Card>
    </Box>
  );
}