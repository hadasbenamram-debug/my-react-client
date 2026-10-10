import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PageTitle from '../components/PageTitle.jsx';
import StatGrid from '../components/StatGrid.jsx';

export function NgoDashboard() {
  const [ngoData, setNgoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // פנייה לנתיב הייעודי המותאם לעמותה המחוברת
    fetch(`/api/donations/my-ngo-donations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`שגיאה בשרת: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setNgoData(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתוני העמותה:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען נתוני עמותה מהשרת...</Typography>
      </Box>
    );
  }

  const expectedToday = ngoData.filter((d: any) => d.status === 'Pending').length;
  const onTheWay = ngoData.filter((d: any) => d.status === 'Matched').length;
  const received = ngoData.filter((d: any) => d.status === 'Completed').length;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="עמותה"
        title="הדשבורד שלי"
        subtitle="מעקב אחר זרימת המזון והתרומות המיועדות לעמותה."
      />
      <StatGrid
        columns={3}
        cards={[
          { label: 'צפויות להיום', value: expectedToday, icon: <ScheduleIcon />, tone: 'warning' },
          { label: 'בדרך (נאספו)', value: onTheWay, icon: <LocalShippingIcon /> },
          { label: 'התקבלו בהצלחה', value: received, icon: <TaskAltIcon /> },
        ]}
      />
    </Box>
  );
}