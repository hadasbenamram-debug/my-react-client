import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import DonationImage from '../components/DonationImage';
import ManualAssignDialog from '../components/ManualAssignDialog';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { AdminDonationView } from '../types/api';
import { DONATION_STATUS_LABELS } from '../utils/format';
import { getToken } from '../utils/auth';

export function AdminDonationsManagementPage() {
  const [donations, setDonations] = useState<AdminDonationView[]>([]);
  const [loading, setLoading] = useState(true);
  // תיקון 36: שיבוץ ידני של תרומה ממתינה למתנדב שהמנהל בוחר (אותו דיאלוג כמו בעמוד "טיפול באי-הגעה")
  const [assignDonationId, setAssignDonationId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDonations = () => {
    const token = getToken();

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
      .then((data: AdminDonationView[]) => {
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
    const token = getToken();
    const reason = window.prompt('סיבת הביטול (תישלח למתנדב אם כבר שובץ):', 'התרומה בוטלה ע"י מנהל.');
    if (reason === null) return;

    fetch(`/api/donations/${donationId}/cancel`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason })
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
        subtitle="מעקב אחר כלל התרומות במערכת והתערבות ידנית: שיבוץ ידני למתנדב או ביטול."
      />

      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}

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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DonationImage image={item.image} />
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
                  <Chip size="small" variant="outlined" color="primary" label={DONATION_STATUS_LABELS[item.status] ?? item.status} />
                </Box>
                <Typography color="text.secondary">
                  <strong>ספק:</strong> {item.supplierName || `מזהה #${item.supplierId}`}
                </Typography>
              </Box>
            </Box>
            {(item.status === 'Pending' || item.status === 'Matched') && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {item.status === 'Pending' && (
                  <Button variant="contained" onClick={() => setAssignDonationId(item.id)}>
                    שיבוץ ידני
                  </Button>
                )}
                <Button variant="outlined" color="error" onClick={() => handleManualIntervention(item.id)}>
                  בטל תרומה (התערבות)
                </Button>
              </Stack>
            )}
          </Card>
        ))
      )}

      <ManualAssignDialog
        donationId={assignDonationId}
        onClose={() => setAssignDonationId(null)}
        onAssigned={(text) => {
          setAssignDonationId(null);
          setNotice(text);
          fetchDonations();
        }}
      />
    </Box>
  );
}