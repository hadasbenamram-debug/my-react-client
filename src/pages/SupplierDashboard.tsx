import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PageTitle from '../components/PageTitle';
import StatGrid from '../components/StatGrid';
import type { ApiErrorBody, SupplierDonationSummaryDto } from '../types/api';

export function SupplierDashboard() {
  const [stats, setStats] = useState({ activeDonations: 0, completedDonations: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSupplierData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('לא נמצא טוקן התחברות.');
        setLoading(false);
        return;
      }

      try {
        // פנייה לנתיב החדש שמזהה את הספק אוטומטית לפי הטוקן
        const response = await fetch(`/api/donations/my-supplier-donations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data: SupplierDonationSummaryDto[] = await response.json();

          if (Array.isArray(data)) {
            // שים לב לשימוש בסטטוסים המדויקים שמוחזרים מהשרת
            const active = data.filter((d: SupplierDonationSummaryDto) => d.status === 'Pending' || d.status === 'Matched' || d.status === 'PickedUp' || d.status === 'Delivered').length;
            const completed = data.filter((d: SupplierDonationSummaryDto) => d.status === 'Completed').length;
            setStats({ activeDonations: active, completedDonations: completed });
          }
        } else {
          const errData: ApiErrorBody = await response.json().catch(() => ({}));
          setError(errData.message || 'שגיאה בטעינת הנתונים מהשרת.');
        }
      } catch (err) {
        console.error('שגיאת תקשורת:', err);
        setError('שגיאת תקשורת מול השרת.');
      } finally {
        setLoading(false);
      }
    };

    fetchSupplierData();
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
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle
        eyebrow="ארגון תורם"
        title="הדשבורד שלי"
        subtitle="ברוכים הבאים למערכת ניהול התרומות העסקיות."
      />
      <StatGrid
        columns={2}
        cards={[
          { label: 'תרומות פעילות', value: stats.activeDonations, icon: <VolunteerActivismIcon /> },
          { label: 'תרומות שהושלמו', value: stats.completedDonations, icon: <TaskAltIcon /> },
        ]}
      />
    </Box>
  );
}
