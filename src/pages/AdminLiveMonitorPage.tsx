import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import MapIcon from '@mui/icons-material/Map';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { LiveMissionView } from '../types/api';
import { formatTime, MATCH_STATUS_LABELS } from '../utils/format';
import { getToken } from '../utils/auth';

export function AdminLiveMonitorPage() {
  const navigate = useNavigate();
  const [activeMissions, setActiveMissions] = useState<LiveMissionView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    fetch('/api/admin/live-monitor', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then((data: LiveMissionView[]) => {
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

      {/* כל המסלולים שבדרך עכשיו על מפה אחת, בשידור חי */}
      <Button variant="contained" startIcon={<MapIcon />} sx={{ mb: 3 }} onClick={() => navigate('/app/admin/live-map')}>
        כל המסלולים על המפה
      </Button>

      {activeMissions.length === 0 ? (
        <EmptyState text="אין מתנדבים בפעילות חיה כרגע." />
      ) : (
        activeMissions.map((item) => (
          <Card key={item.id} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>מסלול #{item.id} - מתנדב: {item.volunteerName || item.volunteerId} · {item.stopsCount} תחנות</Typography>
              <Typography color="text.secondary" variant="body2">יעד: {item.destination || 'עמותה'} | ספקים: {item.supplierName || 'לא צוין'}</Typography>
              <Typography color="text.secondary" variant="body2">
                מיקום אחרון: {item.latitude != null && item.longitude != null ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)} (${formatTime(item.locationUpdatedAt)})` : 'לא שותף'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip color="warning" label={MATCH_STATUS_LABELS[item.status] ?? item.status} />
              <Button size="small" variant="outlined" startIcon={<MyLocationIcon />} onClick={() => navigate(`/app/track/${item.id}`)}>
                מעקב חי
              </Button>
            </Stack>
          </Card>
        ))
      )}
    </Box>
  );
}