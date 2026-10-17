import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { SupplierDonationSummaryDto } from '../types/api';
import { authHeaders } from '../utils/auth';
import { DONATION_STATUS_LABELS, formatDateTime } from '../utils/format';

// היסטוריית תרומות. תוקן: העמוד ציפה לרשימת תרומות בתוך api/suppliers/current (שלא קיימת שם).
export function SupplierHistoryPage() {
  const [history, setHistory] = useState<SupplierDonationSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/donations/my-supplier-donations', { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as SupplierDonationSummaryDto[]) : []))
      .then((all) => setHistory(all.filter((d) => ['Completed', 'Expired', 'Cancelled'].includes(d.status))))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock text="טוען היסטוריית תרומות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title="היסטוריית תרומות" subtitle="תרומות שהושלמו, פגו או בוטלו." />

      {history.length === 0 ? (
        <EmptyState text="אין עדיין תרומות בהיסטוריה." />
      ) : (
        history.map((item) => (
          <Card
            key={item.id}
            sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>תרומה #{item.id}</Typography>
              <Typography color="text.secondary"><strong>אזור:</strong> {item.regionName} · <strong>נוצרה:</strong> {formatDateTime(item.createdAt)}</Typography>
            </Box>
            <Chip size="small" color={item.status === 'Completed' ? 'primary' : 'default'} label={DONATION_STATUS_LABELS[item.status] ?? item.status} />
          </Card>
        ))
      )}
    </Box>
  );
}
