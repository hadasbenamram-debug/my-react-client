import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import NavigationIcon from '@mui/icons-material/Navigation';
import MapIcon from '@mui/icons-material/Map';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function ActiveRoutePage() {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');

    fetch('/api/matches/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Network response was not ok');
        }
        return res.json();
      })
      .then(data => {
        // הנחה שה-API מחזיר רשימה, ואנחנו לוקחים את השיבוץ הפעיל הראשון
        const activeMatch = Array.isArray(data) ? data[0] : data;
        if (activeMatch) {
          setRouteData(activeMatch);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAcceptMatch = (matchId: number, address?: string) => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');

    // 1. קריאה לשרת לעדכון סטטוס האישור והמתנדב
    fetch(`/api/matches/${matchId}/accept`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // 2. הצגת הודעה לבקשת אישור ניווט
          alert('תאשר ניווט');

          // 3. פתיחת מפה (Waze) עם כתובת היעד (אם קיימת, או ברירת מחדל)
          const destination = address || 'ישראל';
          window.open(`https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`, '_blank');

          // רענון או עדכון מקומי של הסטטוס במסך אם נדרש
          setRouteData((prev: any) => ({ ...prev, status: 'Confirmed' }));
        } else {
          alert(data.message || 'שגיאה באישור השידוך.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('שגיאת תקשורת מול השרת.');
      });
  };

  if (loading) return <LoadingBlock text="טוען מסלול מול השרת..." />;
  if (!routeData) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <PageTitle eyebrow="מתנדב" title="מסלול פעיל" />
        <EmptyState text="אין מסלול פעיל כרגע." />
      </Box>
    );
  }

  const address: string | undefined = routeData.donation?.address;
  // קישור ניווט ל-Google Maps (לא דורש מפתח API)
  const googleMapsUrl = address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`
    : null;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="בקשות איסוף נכנסות" />

      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <Typography variant="h5">שיבוץ #{routeData.id}</Typography>
          <Chip variant="outlined" color="primary" label={routeData.status} />
        </Box>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>מזהה תרומה:</strong> #{routeData.donationId || routeData.donation?.id}
        </Typography>
        {address && (
          <Typography color="text.secondary">
            <strong>כתובת איסוף:</strong> {address}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<NavigationIcon />}
            onClick={() => handleAcceptMatch(routeData.id, address)}
          >
            אישור איסוף
          </Button>
          {googleMapsUrl && (
            <Button
              variant="outlined"
              size="large"
              startIcon={<MapIcon />}
              component="a"
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              פתח ב-Google Maps
            </Button>
          )}
        </Box>
      </Card>
    </Box>
  );
}
