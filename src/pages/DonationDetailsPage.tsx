import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';

export function DonationDetailsPage() {
  const [donation, setDonation] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const donationId = 1; // מזהה התרומה להצגה

  useEffect(() => {
    const token = localStorage.getItem('token'); // שליפת הטוקן

    // שליפת פרטי תרומה ספציפית מהשרת כולל שליחת הטוקן
    fetch(`/api/donations/${donationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('תרומה לא נמצאה');
        return res.json();
      })
      .then(data => {
        setDonation(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת פרטי התרומה:', err);
        setLoading(false);
      });
  }, [donationId]);

  if (loading) return <LoadingBlock text="טוען פרטי תרומה מהשרת..." />;
  if (!donation) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <EmptyState text="התרומה המבוקשת לא נמצאה במסד הנתונים." />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title={`פרטי תרומה #${donation.id}`} />

      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <Typography><strong>סטטוס נוכחי:</strong></Typography>
          <Chip size="small" color="primary" label={donation.status || 'Pending'} />
        </Box>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>מזהה אזור:</strong> {donation.regionId}</Typography>
        <Typography color="text.secondary" sx={{ mb: 0.5 }}>
          <strong>עמותת יעד:</strong> {donation.ngoId || 'טרם שובצה עמותה'}
        </Typography>
        <Typography color="text.secondary"><strong>ניקוד עדיפות:</strong> {donation.priorityScore}</Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" sx={{ mb: 1.5 }}>פרטי המתנדב שאסף</Typography>
        {donation.volunteer ? (
          <Box>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>מזהה מתנדב:</strong> #{donation.volunteer.id}</Typography>
            <Typography color="text.secondary" sx={{ mb: 0.5 }}><strong>סוג רכב:</strong> {donation.volunteer.vehicleType}</Typography>
            <Typography color="text.secondary">
              <strong>זמן איסוף משוער/בפועל:</strong> {donation.volunteer.collectionTime || 'בטיפול'}
            </Typography>
          </Box>
        ) : (
          <Typography color="text.secondary">טרם שובץ מתנדב לתרומה זו.</Typography>
        )}
      </Card>
    </Box>
  );
}
