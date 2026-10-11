import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';

export function ConfirmDonationReceiptPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPendingReceipts = () => {
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
      .then(data => {
        if (Array.isArray(data)) {
          // הצגת תרומות שנמצאות בסטטוס בדרך (Matched) וממתינות לאישור קבלה
          const pendingReceipt = data.filter((d: any) => d.status === 'Matched');
          setDonations(pendingReceipt);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתונים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPendingReceipts();
  }, []);

  const handleConfirmReceipt = (item: any) => {
    const token = localStorage.getItem('token');

    fetch(`/api/donations/${item.id}/complete`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (res.ok) {
          // מעבר אוטומטי לעמוד הדירוג עם מזהה ההתאמה או המתנדב
          navigate(`/rate/${item.matchId || item.volunteerId}`);
        } else {
          alert('שגיאה באישור קבלת התרומה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען תרומות להמתנה..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="אישור קבלת תרומה" subtitle="אשרו שהתרומה הגיעה, ואז תוכלו לדרג את המסירה." />

      {donations.length === 0 ? (
        <EmptyState text="אין תרומות הממתינות לאישור קבלה כרגע." />
      ) : (
        donations.map((item) => (
          <Card
            key={item.id}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
                <Chip size="small" variant="outlined" color="warning" label="ממתין לאישור קבלה" />
              </Box>
              <Typography color="text.secondary"><strong>מזהה מתנדב:</strong> {item.volunteerId || 'לא צוין'}</Typography>
            </Box>
            <Button variant="contained" onClick={() => handleConfirmReceipt(item)}>
              אשר קבלה בעת הגעה
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}