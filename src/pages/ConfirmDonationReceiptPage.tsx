import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { NgoDonationView } from '../types/api';
import { readErrorMessage } from '../utils/apiError';
import { DONATION_STATUS_LABELS } from '../utils/format';
import { getToken } from '../utils/auth';

export function ConfirmDonationReceiptPage() {
  const [donations, setDonations] = useState<NgoDonationView[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPendingReceipts = () => {
    const token = getToken();

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
      .then((data: NgoDonationView[]) => {
        if (Array.isArray(data)) {
          // אפשר לאשר קבלה לתרומה שנאספה (בדרך) או שהמתנדב סימן שמסר
          const pendingReceipt = data.filter((d: NgoDonationView) => d.status === 'PickedUp' || d.status === 'Delivered');
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

  const handleConfirmReceipt = (item: NgoDonationView) => {
    const token = getToken();

    // תוקן: היה PUT לנתיב שלא קיים, ואחר כך מעבר ל-/rate/... שגם הוא לא קיים
    fetch(`/api/donations/${item.id}/confirm-receipt`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async res => {
        if (res.ok) {
          // מעבר לדירוג המסירה (השרת מחזיר את מזהה השידוך)
          const body = (await res.json()) as { matchId: number };
          navigate(`/app/ngo/ratings/${body.matchId}`);
        } else {
          alert(await readErrorMessage(res, 'שגיאה באישור קבלת התרומה.'));
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
                <Chip size="small" variant="outlined" color="warning" label={DONATION_STATUS_LABELS[item.status] ?? item.status} />
              </Box>
              <Typography color="text.secondary"><strong>מאת:</strong> {item.supplierName ?? '—'} · <strong>מתנדב:</strong> {item.volunteerName ?? '—'}</Typography>
              <Typography color="text.secondary"><strong>משקל:</strong> {item.totalWeightKg.toFixed(1)} ק"ג · {item.categories.map((c) => `${c.categoryName ?? ''} ×${c.quantity}`).join(', ')}</Typography>
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