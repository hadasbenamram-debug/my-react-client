import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function NgoHistoryPage() {
  const [completedDonations, setCompletedDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const ngoId = 1;

  useEffect(() => {
    fetch(`/api/donations`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // סינון תרומות שהושלמו ושייכות לעמותה
          const ngoCompleted = data.filter((d: any) => d.ngoId === ngoId && d.status === 'Completed');
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
            <Typography color="text.secondary"><strong>מזהה ספק (תורם):</strong> {item.supplierId}</Typography>
            <Typography color="text.secondary"><strong>מזהה מתנדב:</strong> {item.volunteerId || 'לא צוין'}</Typography>
          </Card>
        ))
      )}
    </Box>
  );
}
