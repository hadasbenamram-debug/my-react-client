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
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('jwt');
    let userRole = 'guest';
    
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        userRole = (user.role || user.type || '').toLowerCase();
      }
    } catch (e) {
      console.error(e);
    }

    const adminCheck = userRole === 'admin';
    setIsAdmin(adminCheck);

    // מנהל מקבל את כל המסלולים, מתנדב מקבל את המסלול האישי שלו בלבד
    const apiEndpoint = adminCheck ? '/api/matches' : '/api/matches/active';

    fetch(apiEndpoint, {
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
        if (adminCheck) {
          setRoutes(Array.isArray(data) ? data : data.matches || []);
        } else {
          const activeMatch = Array.isArray(data) ? data[0] : data;
          setRoutes(activeMatch ? [activeMatch] : []);
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
          alert('תאשר ניווט');
          const destination = address || 'ישראל';
          window.open(`https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`, '_blank');

          setRoutes(prev =>
            prev.map(item => (item.id === matchId ? { ...item, status: 'Confirmed' } : item))
          );
        } else {
          alert(data.message || 'שגיאה באישור השידוך.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('שגיאת תקשורת מול השרת.');
      });
  };

  if (loading) return <LoadingBlock text="טוען נתונים מול השרת..." />;
  
  if (routes.length === 0) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <PageTitle 
          eyebrow={isAdmin ? "ניהול מערכת" : "מתנדב"} 
          title={isAdmin ? "כל המסלולים הפעילים" : "מסלול פעיל"} 
        />
        <EmptyState text={isAdmin ? "אין מסלולים פעילים במערכת כרגע." : "אין מסלול פעיל כרגע."} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle 
        eyebrow={isAdmin ? "ניהול מערכת" : "מתנדב"} 
        title={isAdmin ? "מעקב אחר כלל המסלולים הפעילים בשטח" : "בקשת איסוף נכנסת"} 
      />

      {routes.map(routeData => {
        const address: string | undefined = routeData.donation?.address;
        const googleMapsUrl = address
          ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`
          : null;

        return (
          <Card key={routeData.id} sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="h5">שיבוץ #{routeData.id}</Typography>
              <Chip variant="outlined" color="primary" label={routeData.status} />
            </Box>

            {isAdmin && routeData.volunteer && (
              <Typography color="text.secondary" sx={{ mb: 0.5 }}>
                <strong>מתנדב משויך:</strong> {routeData.volunteer.name || routeData.volunteer.email}
              </Typography>
            )}

            <Typography color="text.secondary" sx={{ mb: 0.5 }}>
              <strong>מזהה תרומה:</strong> #{routeData.donationId || routeData.donation?.id}
            </Typography>

            {address && (
              <Typography color="text.secondary">
                <strong>כתובת איסוף:</strong> {address}
              </Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 3 }}>
              {!isAdmin && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<NavigationIcon />}
                  onClick={() => handleAcceptMatch(routeData.id, address)}
                >
                  אישור איסוף
                </Button>
              )}
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
        );
      })}
    </Box>
  );
}