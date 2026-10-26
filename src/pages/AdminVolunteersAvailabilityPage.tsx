import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { VolunteerAvailabilityView } from '../types/api';
import { getToken } from '../utils/auth';

export function AdminVolunteersAvailabilityPage() {
  const [availabilityList, setAvailabilityList] = useState<VolunteerAvailabilityView[]>([]);
  const [loading, setLoading] = useState(true);
  const [dayFilter, setDayFilter] = useState('');

  useEffect(() => {
    const token = getToken();
    fetch('/api/admin/volunteers/availability', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then((data: VolunteerAvailabilityView[]) => {
        if (Array.isArray(data)) {
          setAvailabilityList(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת זמינות מתנדבים:', err);
        setLoading(false);
      });
  }, []);

  const filteredList = availabilityList.filter(item =>
    dayFilter === '' || (item.day && item.day.toLowerCase().includes(dayFilter.toLowerCase()))
  );

  if (loading) return <LoadingBlock text="טוען נתוני זמינות..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <PageTitle eyebrow="ניהול מערכת" title="מעקב זמינות מתנדבים" subtitle="צפייה בלוחות זמנים וזמינות שבועית של כלל המתנדבים." />

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="סינון לפי יום בשבוע (למשל: ראשון, שני...)"
          variant="outlined"
          value={dayFilter}
          onChange={(e) => setDayFilter(e.target.value)}
        />
      </Box>

      {filteredList.length === 0 ? (
        <EmptyState text="אין נתוני זמינות להצגה." />
      ) : (
        filteredList.map((item, index) => (
          <Card key={index} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{item.volunteerName || `מתנדב #${item.volunteerId}`}</Typography>
              <Typography color="text.secondary" variant="body2">שעות פנויות: {item.timeSlot || 'לא צוין'}</Typography>
            </Box>
            <Chip color="primary" label={item.day || 'יום כללי'} />
          </Card>
        ))
      )}
    </Box>
  );
}