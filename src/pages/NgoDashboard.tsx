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
  const ngoId = 1; // מזהה העמותה המחוברת

  useEffect(() => {
    // שליפת התרומות או הנתונים המשויכים לעמותה מהשרת
    fetch(`/api/donations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // סינון תרומות המיועדות לעמותה זו (לפי ngoId)
          const ngoDonations = data.filter((d: any) => d.ngoId === ngoId);
          setNgoData(ngoDonations);
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
