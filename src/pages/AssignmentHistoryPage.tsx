import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function AssignmentHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת הטוקן מתוך האחסון המקומי
    const token = localStorage.getItem('token');

    // פנייה לנתיב הפעיל שמתאים למתנדב ומקבל הזדהות
    fetch('/api/matches/active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען היסטוריה מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="היסטוריית שיבוצים" />
      {!Array.isArray(history) || history.length === 0 ? (
        <EmptyState text="אין היסטוריית שיבוצים זמינה." />
      ) : (
        history.map((item, idx) => (
          <Card
            key={idx}
            sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 500 }}>שיבוץ #{item.id}</Typography>
            <Chip size="small" variant="outlined" color="primary" label={item.status} />
          </Card>
        ))
      )}
    </Box>
  );
}
