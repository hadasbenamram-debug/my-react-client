import { useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import type { SupplierDonationSummaryDto } from '../types/api';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSupplierDonations, selectSupplierDonations, selectSupplierDonationsStatus } from '../store/supplierSlice';
import { DONATION_STATUS_LABELS, formatDateTime } from '../utils/format';
import DonationLink from '../components/DonationLink';

// היסטוריית תרומות. תוקן: העמוד ציפה לרשימת תרומות בתוך api/suppliers/current (שלא קיימת שם).
export function SupplierHistoryPage() {
  const dispatch = useAppDispatch();
  const all = useAppSelector(selectSupplierDonations);
  const status = useAppSelector(selectSupplierDonationsStatus);
  // שגיאה בטעינה - מוצגת רשימה ריקה (כמו קודם)
  const history = useMemo<SupplierDonationSummaryDto[]>(
    () => (all ?? []).filter((d) => ['Completed', 'Expired', 'Cancelled'].includes(d.status)),
    [all],
  );
  const loading = all === null && status !== 'failed';

  useEffect(() => {
    void dispatch(fetchSupplierDonations());
  }, [dispatch]);

  if (loading) return <LoadingBlock text="טוען היסטוריית תרומות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="ארגון תורם" title="היסטוריית תרומות" subtitle="תרומות שהושלמו, פגו או בוטלו. לחיצה על תרומה פותחת את הפרטים, המעקב והשיחה." />

      {history.length === 0 ? (
        // תיקון 76: מסך ריק עם הצעד הבא
        <EmptyState
          icon={<HistoryOutlinedIcon />}
          title="עוד אין תרומות בהיסטוריה"
          text="תרומות שהושלמו, פגו או בוטלו יופיעו כאן. אפשר להתחיל עכשיו בתרומה הראשונה."
          action={{ label: 'יצירת תרומה חדשה', to: '/app/supplier/create-donation' }}
        />
      ) : (
        history.map((item) => (
          <Card
            key={item.id}
            sx={{ p: { xs: 2.5, md: 3 }, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}><DonationLink role="supplier" id={item.id}>תרומה #{item.id}</DonationLink></Typography>
              <Typography color="text.secondary"><strong>אזור:</strong> {item.regionName} · <strong>נוצרה:</strong> {formatDateTime(item.createdAt)}</Typography>
            </Box>
            <Chip size="small" color={item.status === 'Completed' ? 'primary' : 'default'} label={DONATION_STATUS_LABELS[item.status] ?? item.status} />
          </Card>
        ))
      )}
    </Box>
  );
}
