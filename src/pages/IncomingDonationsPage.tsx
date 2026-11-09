import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PageTitle from '../components/PageTitle';
import DonationImage from '../components/DonationImage';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { NgoDonationView } from '../types/api';
import { DONATION_STATUS_LABELS, MATCH_STATUS_LABELS, formatTime } from '../utils/format';
import { getToken } from '../utils/auth';

// המתנדב בדרך עכשיו (יצא לאיסוף / אסף ובדרך לעמותה) - יש מעקב חי על המפה
const ON_THE_WAY = ['InPickup', 'InTransit'];

export function IncomingDonationsPage() {
  const navigate = useNavigate();
  const [incoming, setIncoming] = useState<NgoDonationView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = getToken();

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
        subtitle="מעקב אחר מתנדבים שבדרך עם משלוחי מזון - כולל מעקב חי על המפה."
      />

      {incoming.length === 0 ? (
        <EmptyState text="אין כרגע תרומות שנמצאות בדרכן לעמותה." />
      ) : (
        incoming.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <DonationImage image={item.image} />
                <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
              </Box>
              <Chip
                size="small"
                color="primary"
                label={item.matchStatus ? MATCH_STATUS_LABELS[item.matchStatus] ?? 'בדרך' : 'בדרך'}
              />
            </Box>
            <Typography color="text.secondary">
              <strong>מתנדב:</strong> {item.volunteerName ?? 'בטיפול'} · <strong>מאת:</strong> {item.supplierName ?? '—'} · <strong>הגעה משוערת לאיסוף:</strong> {formatTime(item.estimatedArrival)} · <strong>סטטוס:</strong> {DONATION_STATUS_LABELS[item.status] ?? item.status}
            </Typography>
            {item.volunteerRouteId != null && (
              <Box sx={{ mt: 2 }}>
                <Button
                  variant={item.matchStatus && ON_THE_WAY.includes(item.matchStatus) ? 'contained' : 'outlined'}
                  startIcon={<MyLocationIcon />}
                  onClick={() => navigate(`/app/track/${item.volunteerRouteId}`)}
                >
                  {item.matchStatus && ON_THE_WAY.includes(item.matchStatus) ? 'מעקב חי על המפה' : 'המסלול על המפה'}
                </Button>
              </Box>
            )}
          </Card>
        ))
      )}
    </Box>
  );
}