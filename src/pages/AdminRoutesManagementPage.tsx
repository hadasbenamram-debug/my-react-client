import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { MatchView } from '../types/api';
import { formatTime, MATCH_STATUS_LABELS } from '../utils/format';

export function AdminRoutesManagementPage() {
  const [routes, setRoutes] = useState<MatchView[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutes = () => {
    const token = localStorage.getItem('token');

    fetch('/api/matches/active', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת מסלולים פעילים');
        return res.json();
      })
      .then((data: MatchView[]) => {
        if (Array.isArray(data)) {
          setRoutes(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת מסלולים פעילים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  if (loading) return <LoadingBlock text="טוען מסלולים פעילים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="מסלולים ושיבוצים בזמן אמת"
        subtitle="מעקב אחר כלל המסלולים, המתנדבים הפעילים ויעדי המשלוחים במערכת."
      />

      {routes.length === 0 ? (
        <EmptyState text="אין מסלולים פעילים כרגע במערכת." />
      ) : (
        routes.map((route) => (
          <Card key={route.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {route.volunteerRouteId ? `מסלול #${route.volunteerRouteId}` : `שידוך #${route.id}`} · תרומה #{route.donationId}
              </Typography>
              <Chip size="small" variant="outlined" color="primary" label={MATCH_STATUS_LABELS[route.statusName] ?? route.statusName} />
            </Box>
            <Typography color="text.secondary">
              <strong>מתנדב משובץ:</strong> {route.volunteerName || route.volunteerId || 'לא צוין'}
            </Typography>
            <Typography color="text.secondary">
              <strong>איסוף:</strong> {route.supplierName || '—'} ({route.pickupAddress || '—'}) · הגעה משוערת {formatTime(route.estimatedArrival)}
            </Typography>
            <Typography color="text.secondary">
              <strong>יעד / עמותה:</strong> {route.ngoName || '—'} ({route.ngoAddress || '—'})
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}
