import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function SupplierHistoryPage() {
  const [completedDonations, setCompletedDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // שליפת נתוני הספק המחובר הנוכחי ישירות מהשרת באמצעות הטוקן
    fetch('/api/suppliers/current', {
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
      .then(supplierData => {
        // במידה והתרומות מגיעות כחלק ממידע הספק או מקור אחר
        const donations = supplierData.donations || supplierData.completedDonations || [];
        if (Array.isArray(donations)) {
          const completed = donations.filter((d: any) => d.status === 'Completed');
          setCompletedDonations(completed);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת היסטוריה:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען היסטוריית תרומות מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title="היסטוריית תרומות" subtitle="רשימת התרומות שהושלמו במלואן." />

      {completedDonations.length === 0 ? (
        <EmptyState text="אין תרומות שהושלמו במסד הנתונים עדיין." />
      ) : (
        completedDonations.map((item) => (
          <Card
            key={item.id}
            sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
              <Typography color="text.secondary"><strong>אזור:</strong> {item.regionId}</Typography>
            </Box>
            <Chip size="small" color="primary" label="הושלם" />
          </Card>
        ))
      )}
    </Box>
  );
}