import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { NgoDonationView } from '../types/api';
import { DONATION_STATUS_LABELS, formatTime } from '../utils/format';

export function IncomingDonationsPage() {
  const [incoming, setIncoming] = useState<NgoDonationView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // שליפת התרומות מהנתיב הייעודי לעמותות המחוברות
    fetch('/api/donations/my-ngo-donations', {
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
          // סינון תרומות שנמצאות בסטטוס בדרך (Matched)
          // בדרך לעמותה: שובצה (ממתינה לאיסוף) או נאספה
          const matchedDonations = data.filter((d: NgoDonationView) => d.status === 'Matched' || d.status === 'PickedUp' || d.status === 'Delivered');
          setIncoming(matchedDonations);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת תרומות נכנסות:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען תרומות נכנסות מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle
        eyebrow="עמותה"
        title="תרומות נכנסות בדרך"
        subtitle="מעקב אחר מתנדבים שבדרך עם משלוחי מזון."
      />

      {incoming.length === 0 ? (
        <EmptyState text="אין כרגע תרומות שנמצאות בדרכן לעמותה." />
      ) : (
        incoming.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
              <Chip size="small" color="primary" label="בדרך" />
            </Box>
            <Typography color="text.secondary">
              <strong>מתנדב:</strong> {item.volunteerName ?? 'בטיפול'} · <strong>מאת:</strong> {item.supplierName ?? '—'} · <strong>הגעה משוערת לאיסוף:</strong> {formatTime(item.estimatedArrival)} · <strong>סטטוס:</strong> {DONATION_STATUS_LABELS[item.status] ?? item.status}
            </Typography>
            <Typography color="text.secondary">
              <strong>זמן הגעה משוער (ETA):</strong> 15-30 דקות
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}