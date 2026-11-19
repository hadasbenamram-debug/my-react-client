import { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import type { NgoDonationView } from '../types/api';
import { formatDateTime } from '../utils/format';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchNgoDonations, selectNgoDonations, selectNgoDonationsStatus } from '../store/ngoSlice';
import DonationLink from '../components/DonationLink';

export function NgoHistoryPage() {
  const dispatch = useAppDispatch();
  const data = useAppSelector(selectNgoDonations);
  const status = useAppSelector(selectNgoDonationsStatus);
  // סינון תרומות שהושלמו בלבד
  const completedDonations = useMemo<NgoDonationView[]>(
    () => (data ?? []).filter((d) => d.status === 'Completed'),
    [data],
  );
  const loading = data === null && status !== 'failed';

  useEffect(() => {
    // פנייה לנתיב הייעודי המותאם לעמותה המחוברת (הטוקן מצורף ב-thunk)
    dispatch(fetchNgoDonations())
      .unwrap()
      .catch((err: unknown) => console.error('שגיאה בטעינת היסטוריית תרומות:', err));
  }, [dispatch]);

  if (loading) return <LoadingBlock text="טוען היסטוריה מהשרת..." />;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <PageTitle eyebrow="עמותה" title="היסטוריית תרומות שהתקבלו" />

      {completedDonations.length === 0 ? (
        // תיקון 76: מסך ריק עם הצעד הבא
        <EmptyState
          icon={<Inventory2OutlinedIcon />}
          title="עוד לא התקבלו תרומות"
          text="תרומות שהגיעו אליכם ואושרה קבלתן יופיעו כאן. כדי לקבל תרומות, כדאי לוודא ששעות הקבלה והקיבולת היומית מעודכנות."
          action={{ label: 'שעות הקבלה שלנו', to: '/app/ngo/hours' }}
          secondaryAction={{ label: 'ללוח הבקרה', to: '/app/ngo/dashboard' }}
        />
      ) : (
        completedDonations.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}><DonationLink role="ngo" id={item.id}>תרומה #{item.id}</DonationLink></Typography>
              <Chip size="small" color="primary" label="הושלם" />
            </Box>
            <Typography color="text.secondary"><strong>ספק (תורם):</strong> {item.supplierName ?? item.supplierId}</Typography>
            <Typography color="text.secondary"><strong>מתנדב:</strong> {item.volunteerName ?? 'לא צוין'} · <strong>התקבלה:</strong> {formatDateTime(item.receivedAt)} · {item.totalWeightKg.toFixed(1)} ק"ג</Typography>
          </Card>
        ))
      )}
    </Box>
  );
}