import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function AdminLiveMonitorPage() {
  const [activeMissions, setActiveMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/live-monitor', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiveMissions(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתונים חיים מהשטח:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען נתוני פעילות בזמן אמת..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <PageTitle eyebrow="ניהול מערכת" title="מוניטור פעילות בשטח" subtitle="צפייה בזמן אמת במתנדבים הנמצאים כעת בביצוע משלוחים." />

      {activeMissions.length === 0 ? (
        <EmptyState text="אין מתנדבים בפעילות חיה כרגע." />
      ) : (
        activeMissions.map((item) => (
          <Card key={item.id} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>משלוח #{item.id} - מתנדב: {item.volunteerName || item.volunteerId}</Typography>
              <Typography color="text.secondary" variant="body2">יעד: {item.destination || 'עמותה'} | ספק: {item.supplierName || 'לא צוין'}</Typography>
            </Box>
            <Chip color="warning" label={item.status || 'בדרך'} />
          </Card>
        ))
      )}
    </Box>
  );
}