import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { MatchView } from '../types/api';
import { authHeaders } from '../utils/auth';
import { MATCH_STATUS_LABELS } from '../utils/format';

export function AssignmentHistoryPage() {
  const [history, setHistory] = useState<MatchView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // שליפת הטוקן מתוך האחסון המקומי
    // פנייה לנתיב הפעיל שמתאים למתנדב ומקבל הזדהות
    fetch('/api/matches/active', {
      headers: authHeaders()
    })
      .then(res => res.json())
      .then((data: MatchView[]) => {
        setHistory(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="טוען היסטוריה מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="היסטוריית שיבוצים" />
      {!Array.isArray(history) || history.length === 0 ? (
        <EmptyState text="אין היסטוריית שיבוצים זמינה." />
      ) : (
        history.map((item, idx) => (
          <Card
            key={idx}
            sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
          >
            <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.donationId} · {item.supplierName ?? ''} ← {item.ngoName ?? ''}</Typography>
            <Chip size="small" variant="outlined" color="primary" label={MATCH_STATUS_LABELS[item.statusName] ?? item.statusName} />
          </Card>
        ))
      )}
    </Box>
  );
}
