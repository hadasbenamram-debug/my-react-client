import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { NgoDonationView } from '../types/api';
import { formatDateTime } from '../utils/format';

export function NgoHistoryPage() {
  const [completedDonations, setCompletedDonations] = useState<NgoDonationView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // פנייה לנתיב הייעודי המותאם לעמותה המחוברת עם שליחת טוקן ההזדהות
    fetch(`/api/donations/my-ngo-donations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בשליפת הנתונים');
        return res.json();
      })
      .then((data: NgoDonationView[]) => {
        if (Array.isArray(data)) {
          // סינון תרומות שהושלמו בלבד
          const ngoCompleted = data.filter((d: NgoDonationView) => d.status === 'Completed');
          setCompletedDonations(ngoCompleted);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת היסטוריית תרומות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען היסטוריה מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="היסטוריית תרומות שהתקבלו" />

      {completedDonations.length === 0 ? (
        <EmptyState text="אין עדיין היסטוריית תרומות שהושלמו במסד הנתונים." />
      ) : (
        completedDonations.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
              <Chip size="small" color="primary" label="הושלם" />
            </Box>
            <Typography color="text.secondary"><strong>ספק (תורם):</strong> {item.supplierName ?? item.supplierId}</Typography>
            <Typography color="text.secondary"><strong>מתנדב:</strong> {item.volunteerName ?? 'לא צוין'} · <strong>התקבלה:</strong> {formatDateTime(item.receivedAt)} · {item.totalWeightKg.toFixed(1)} ק"ג</Typography>
          </Card>
        ))
      )}
    </Box>
  );
}