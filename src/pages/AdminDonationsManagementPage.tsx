import { useCallback, useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { DONATION_STATUS_LABELS } from '../utils/format';
import { toErrorPayload } from '../api/http';
import { useAppDispatch, useAppSelector } from '../store';
import { cancelDonation, fetchAdminDonations, isFirstLoad, selectAdminDonations } from '../store/adminSlice';

// תיקון 75: תרומות שהמנוע כבר שיבץ (יש להן מסלול - ואולי הסבר להחלטה)
const WAS_MATCHED = ['Matched', 'PickedUp', 'Delivered', 'Completed'];

export function AdminDonationsManagementPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const donationsState = useAppSelector(selectAdminDonations);
  const donations = donationsState.items ?? [];
  const loading = isFirstLoad(donationsState, donationsState.items !== null);
  // תיקון 36: שיבוץ ידני של תרומה ממתינה למתנדב שהמנהל בוחר (אותו דיאלוג כמו בעמוד "טיפול באי-הגעה")
  const [assignDonationId, setAssignDonationId] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDonations = useCallback(() => {
    dispatch(fetchAdminDonations())
      .unwrap()
      .catch((err: unknown) => console.error('שגיאה בטעינת ניהול תרומות:', err));
  }, [dispatch]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleManualIntervention = async (donationId: number) => {
    const reason = window.prompt('סיבת הביטול (תישלח למתנדב אם כבר שובץ):', 'התרומה בוטלה ע"י מנהל.');
    if (reason === null) return;

    try {
      await dispatch(cancelDonation({ donationId, reason })).unwrap();
      alert('סטטוס התרומה עודכן בהתערבות ידנית.');
      fetchDonations();
    } catch (err) {
      // כמו קודם: שגיאת תקשורת רק ביומן, תשובת שגיאה מהשרת - הודעה קבועה
      if (toErrorPayload(err).status === 0) console.error('שגיאת תקשורת:', err);
      else alert('שגיאה בעדכון התרומה.');
    }
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
        // תיקון 76: מסך ריק עם הצעד הבא
        <EmptyState
          icon={<LocalShippingOutlinedIcon />}
          title="אין תרומות פעילות כרגע"
          text="תרומות חדשות של ספקים יופיעו כאן עד שייאספו. בינתיים אפשר לעקוב אחרי מסלולים בדרך בחדר הבקרה."
          action={{ label: 'לחדר הבקרה', to: '/app/admin/live-map' }}
          secondaryAction={{ label: 'למנוע השידוכים', to: '/app/admin/matching' }}
        />
      ) : (
        donations.map((item) => (
          <Card
            key={item.id}
            // לחיצה על השורה פותחת את מסך התרומה (פרטים / מעקב / שיחה). לחיצה על כפתור או קישור בתוך השורה לא נחשבת.
            role="link"
            tabIndex={0}
            aria-label={`פתיחת תרומה ${item.id}`}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('button, a')) return;
              navigate(`/app/admin/donation/${item.id}`);
            }}
            onKeyDown={(e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/app/admin/donation/${item.id}`);
              }
            }}
            sx={{
              cursor: 'pointer',
              transition: 'box-shadow .15s ease',
              '&:hover, &:focus-visible': { boxShadow: 4 },
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
            {/* תיקון 75: "למה המנוע בחר את המתנדב?" - לכל תרומה ששובצה */}
            {WAS_MATCHED.includes(item.status) && (
              <Button component={RouterLink} to={`/app/admin/decisions/donation/${item.id}`} variant="text" sx={{ flexShrink: 0 }}>
                למה המתנדב הזה?
              </Button>
            )}
            {(item.status === 'Pending' || item.status === 'Matched') && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                {item.status === 'Pending' && (
                  <Button variant="contained" onClick={() => setAssignDonationId(item.id)}>
                    שיבוץ ידני
                  </Button>
                )}
                <Button variant="outlined" color="error" onClick={() => void handleManualIntervention(item.id)}>
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