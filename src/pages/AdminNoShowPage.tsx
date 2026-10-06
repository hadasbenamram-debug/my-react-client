import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

export function AdminNoShowPage() {
  const [noShows, setNoShows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNoShows = () => {
    const token = localStorage.getItem('token');

    // פנייה נכונה לנתיב הקיים בשרת: /api/matches
    fetch('/api/matches', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת נתונים מהשרת');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          // סינון השידוכים שסטטוס שלהם הוא NoShow (ערך 6 לרוב באנאם או מחרוזת 'NoShow')
          const filtered = data.filter(item => item.status === 'NoShow' || item.status === 6);
          setNoShows(filtered);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת אירועי No-Show:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNoShows();
  }, []);

  const handleReassign = (donationId: number) => {
    const token = localStorage.getItem('token');

    // שימוש ב-endpoint הקיים בשרת לשיבוץ מחדש של תרומה
    fetch(`/api/matches/assign-donation/${donationId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.ok) {
          alert('בוצע שיבוץ מחדש בהצלחה!');
          fetchNoShows();
        } else {
          alert('שגיאה בביצוע שיבוץ מחדש.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען נתוני No-Show..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="טיפול ב-No-Show"
        subtitle="לוג אירועים של אי-התייצבות מתנדבים ומעקב אחר שיבוץ מחדש של תרומות."
      />

      {noShows.length === 0 ? (
        <EmptyState text="אין אירועי No-Show פעילים כרגע." />
      ) : (
        noShows.map((item) => (
          <Card
            key={item.id}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              borderColor: 'error.light',
              backgroundColor: '#fdf3f3',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500, mb: 1 }}>שידוך #{item.id}</Typography>
              <Typography color="text.secondary">
                <strong>מתנדב:</strong> {item.volunteerName || item.volunteerId || 'לא צוין'}
              </Typography>
              <Typography color="text.secondary"><strong>מזהה תרומה:</strong> #{item.donationId}</Typography>
            </Box>
            <Button variant="contained" color="error" onClick={() => handleReassign(item.donationId)}>
              בצע שיבוץ מחדש
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}
