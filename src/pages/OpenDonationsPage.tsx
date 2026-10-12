import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';

interface DonationItem {
  id: number;
  status: string;
  regionId: number;
  regionName?: string; // הוספת שדה שם האזור
  priorityScore: number;
  createdAt?: string;
}

export function OpenDonationsPage() {
  const [donations, setDonations] = useState<DonationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDonations = () => {
    const token = localStorage.getItem('token');

    fetch('/api/donations/my-supplier-donations', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('שגיאה בהבאת הנתונים מהשרת');
        }
        return res.json();
      })
      .then(data => {
        setDonations(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת תרומות:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleCancel = (donationId: number) => {
    if (!window.confirm('האם אתה בטוח שברצונך לבטל תרומה זו?')) return;

    const token = localStorage.getItem('token');

    fetch(`/api/donations/${donationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.ok) {
          alert('התרומה בוטלה בהצלחה.');
          fetchDonations();
        } else {
          alert('לא ניתן לבטל תרומה שכבר שובצה או נאספה.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) return <LoadingBlock text="טוען תרומות פתוחות מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title="תרומות פתוחות" subtitle="רשימת התרומות שלכם וניהולן." />

      {!Array.isArray(donations) || donations.length === 0 ? (
        <EmptyState text="אין תרומות פתוחות כרגע במסד הנתונים." />
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
                <Chip
                  size="small"
                  variant="outlined"
                  color={item.status === 'Pending' ? 'warning' : 'primary'}
                  label={item.status}
                />
              </Box>
              <Typography color="text.secondary">
                <strong>אזור:</strong> {item.regionName || `מזהה אזור: ${item.regionId}`}
              </Typography>
            </Box>
            {item.status === 'Pending' && (
              <Button variant="outlined" color="error" onClick={() => handleCancel(item.id)}>
                ביטול תרומה
              </Button>
            )}
          </Card>
        ))
      )}
    </Box>
  );
}