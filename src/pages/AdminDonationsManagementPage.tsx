import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';

export function AdminDonationsManagementPage() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDonations = () => {
    const token = localStorage.getItem('token');

    fetch('/api/donations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת תרומות');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDonations(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת ניהול תרומות:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleManualIntervention = (donationId: number) => {
    const token = localStorage.getItem('token');

    fetch(`/api/donations/${donationId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.ok) {
          alert('סטטוס התרומה עודכן בהתערבות ידנית.');
          fetchDonations();
        } else {
          alert('שגיאה בעדכון התרומה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען נתוני תרומות מערכתיים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="ניהול תרומות"
        subtitle="מעקב אחר כלל התרומות במערכת והתערבות ידנית בסטטוסים."
      />

      {donations.length === 0 ? (
        <EmptyState text="אין תרומות פעילות במערכת כרגע." />
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
                <Chip size="small" variant="outlined" color="primary" label={item.status} />
              </Box>
              <Typography color="text.secondary"><strong>ספק:</strong> {item.supplierId}</Typography>
            </Box>
            <Button variant="outlined" color="error" onClick={() => handleManualIntervention(item.id)}>
              בטל תרומה (התערבות)
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}
