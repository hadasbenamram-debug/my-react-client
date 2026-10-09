import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';

export function VolunteerDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // שליפת הטוקן מ-localStorage לצורך אימות מול השרת
    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא התחבר מחדש למערכת.');
      setLoading(false);
      return;
    }

    fetch(`/api/matches/active`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        // אם השרת מחזיר 404, המשמעות היא שאין שיבוץ פעיל כרגע - נחזיר null ברוגע
        if (res.status === 404) {
          return null;
        }
        if (!res.ok) {
          throw new Error('שגיאה בהרשאה או בטעינת הנתונים');
        }
        return res.json();
      })
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת הנתונים מהשרת', err);
        setError('שגיאה בטעינת הנתונים. ייתכן שפג תוקף ההתחברות.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען נתונים מהשרת...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto', mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="הדשבורד שלי" subtitle="סטטוס ושיבוצים פעילים." />

      <Card sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="h5">סטטוס נוכחי במערכת:</Typography>
          <Chip label="Available" color="primary" />
        </Box>
        <Typography color="text.secondary" sx={{ mt: 1.5 }}>
          כאן מוצגים הנתונים האמיתיים שנשלפו ישירות מבסיס הנתונים.
        </Typography>
      </Card>

      {dashboardData ? (
        <Alert severity="success" icon={false} sx={{ p: 3 }}>
          <Typography sx={{ fontWeight: 500, mb: 0.5 }}>שיבוץ פעיל נמצא!</Typography>
          <Typography>מזהה שיבוץ: #{dashboardData.id}</Typography>
        </Alert>
      ) : (
        <Card sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
          <Typography color="text.secondary">אין שיבוצים פעילים כרגע במסד הנתונים.</Typography>
        </Card>
      )}
    </Box>
  );
}