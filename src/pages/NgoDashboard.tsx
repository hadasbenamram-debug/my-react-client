import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import PageTitle from '../components/PageTitle';
import StatGrid from '../components/StatGrid';
import type { NgoDonationView } from '../types/api';
import { getToken } from '../utils/auth';

export function NgoDashboard() {
  const [ngoData, setNgoData] = useState<NgoDonationView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();

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
      .then((data: NgoDonationView[]) => {
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

  // התרומות של העמותה הן תרומות ששובצו אליה, ולכן אין כאן Pending
  const expectedToday = ngoData.filter((d: NgoDonationView) => d.status === 'Matched').length;
  const onTheWay = ngoData.filter((d: NgoDonationView) => d.status === 'PickedUp' || d.status === 'Delivered').length;
  const received = ngoData.filter((d: NgoDonationView) => d.status === 'Completed').length;

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