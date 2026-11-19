import { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import type { MatchResponseDto, MatchStatusName } from '../types/api';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchAssignmentHistory,
  selectAssignmentHistory,
  selectAssignmentHistoryError,
  selectAssignmentHistoryStatus,
} from '../store/volunteerSlice';
import { MATCH_STATUS_LABELS, formatDateTime } from '../utils/format';

// היסטוריית השיבוצים של המתנדב.
// תיקון 16: הדף קרא ל-api/matches/active, שמחזיר רק שיבוצים פעילים, ולכן משלוח שהושלם נעלם מהדף
// במקום להופיע בו. עכשיו הדף קורא ל-api/matches/my-history: כל השיבוצים של המתנדב, גם אלה שהסתיימו,
// מהחדש לישן. הצעה שעדיין ממתינה לתשובה לא מופיעה כאן (היא ב"בקשה נכנסת").
// תיקון 73: לחיצה בכל מקום בכרטיס פותחת את מסך התרומה (פרטים / מעקב / שיחה).
//   הקישור "תרומה #N" נמתח על כל הכרטיס (::after) - קישור אמיתי: עובד גם במקלדת ובלחיצה עם Ctrl.

type ChipColor = 'success' | 'primary' | 'error' | 'default';

const IN_PROGRESS: MatchStatusName[] = ['Confirmed', 'InPickup', 'InTransit'];

const chipColor = (status: MatchStatusName): ChipColor => {
  if (status === 'Completed') return 'success';
  if (IN_PROGRESS.includes(status)) return 'primary';
  if (status === 'NoShow') return 'error';
  return 'default';
};

const completedText = (count: number) => {
  if (count === 0) return 'האיסופים שלקחתם על עצמכם, כולל אלה שכבר הסתיימו.';
  if (count === 1) return 'עד היום השלמתם משלוח אחד.';
  return `עד היום השלמתם ${count} משלוחים.`;
};

interface HistoryCardProps {
  item: MatchResponseDto;
}

function HistoryCard({ item }: HistoryCardProps) {
  const inProgress = IN_PROGRESS.includes(item.statusName);
  return (
    <Card
      component="article"
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 2,
        position: 'relative',
        transition: 'box-shadow .2s, transform .2s',
        '&:hover': { boxShadow: 4, transform: 'translateY(-1px)' },
        '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 500 }}>
            {item.supplierName ?? 'ספק'} ← {item.ngoName ?? 'עמותה'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <Box
              component={RouterLink}
              to={`/app/volunteer/donation/${item.donationId}`}
              aria-label={`לפרטי תרומה #${item.donationId}`}
              sx={{
                color: 'inherit',
                textDecorationColor: 'var(--teal)',
                textUnderlineOffset: '0.2em',
                outline: 'none',
                '&::after': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', zIndex: 0 },
              }}
            >
              תרומה #{item.donationId}
            </Box>
          </Typography>
        </Box>
        <Chip
          size="small"
          variant={item.statusName === 'Completed' ? 'filled' : 'outlined'}
          color={chipColor(item.statusName)}
          label={MATCH_STATUS_LABELS[item.statusName] ?? item.statusName}
        />
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 0.5, mt: 1.5 }}>
        <Typography variant="body2"><strong>שובץ:</strong> {formatDateTime(item.createdAt)}</Typography>
        {item.pickedUpAt && <Typography variant="body2"><strong>נאסף:</strong> {formatDateTime(item.pickedUpAt)}</Typography>}
        {item.deliveredAt && <Typography variant="body2"><strong>נמסר:</strong> {formatDateTime(item.deliveredAt)}</Typography>}
      </Box>

      {inProgress && (
        <Button component={RouterLink} to="/app/volunteer/active-route" variant="text" size="small"
          sx={{ mt: 1, px: 0.5, position: 'relative', zIndex: 1 }}>
          למסלול הפעיל
        </Button>
      )}
    </Card>
  );
}

export function AssignmentHistoryPage() {
  const dispatch = useAppDispatch();
  const history = useAppSelector(selectAssignmentHistory);
  const status = useAppSelector(selectAssignmentHistoryStatus);
  const error = useAppSelector(selectAssignmentHistoryError) ?? '';
  const loading = status === 'idle' || status === 'loading';

  useEffect(() => {
    void dispatch(fetchAssignmentHistory());
  }, [dispatch]);

  if (loading) return <LoadingBlock text="טוען היסטוריה מהשרת..." />;

  const completed = history.filter((m) => m.statusName === 'Completed').length;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow="מתנדב" title="היסטוריית שיבוצים" subtitle={error ? undefined : completedText(completed)} />
      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : history.length === 0 ? (
        // תיקון 76: מסך ריק עם הצעד הבא
        <EmptyState
          icon={<HistoryOutlinedIcon />}
          title="עוד אין שיבוצים בהיסטוריה"
          text="אחרי שתאשרו בקשת איסוף היא תופיע כאן. כדי לקבל בקשות, הזמינות השבועית צריכה להיות מעודכנת."
          action={{ label: 'עדכון הזמינות השבועית', to: '/app/volunteer/availability' }}
        />
      ) : (
        history.map((item) => <HistoryCard key={item.id} item={item} />)
      )}
    </Box>
  );
}
