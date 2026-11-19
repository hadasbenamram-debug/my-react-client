import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';

import { formatDateTime } from '../utils/format';
import type { EngineRunResultDto } from '../types/api';
import { MODE_LABELS } from '../types/decisions';
import { errorMessage } from '../api/http';
import { useAppDispatch, useAppSelector } from '../store';
import {
  fetchEngineDecisions, fetchEngineStatus, isFirstLoad, runMatchingEngine, selectEngineDecisions, selectEngineStatus,
} from '../store/adminSlice';
import '../styles/decision.css';

// תוקן: engine-status החזיר ערכים קבועים, ו"הפעל מנוע" לא שמר כלום.
// עכשיו: הנתונים של הריצה האחרונה בפועל + מספרים מהמסד, וההפעלה הידנית היא אותה ריצה של המנוע המתוזמן.

export function AdminMatchingEnginePage() {
  const dispatch = useAppDispatch();
  const engineState = useAppSelector(selectEngineStatus);
  const engineStatus = engineState.item;
  const loading = isFirstLoad(engineState, engineStatus !== null);
  // תיקון 75: ההחלטות האחרונות של המנוע - כל אחת עם הסבר "למה" (null = עוד נטען)
  const decisions = useAppSelector(selectEngineDecisions).items;
  const [lastRun, setLastRun] = useState<EngineRunResultDto | null>(null);
  const [running, setRunning] = useState<boolean>(false);
  const [runError, setRunError] = useState<string | null>(null);
  const error = runError ?? engineState.error;

  useEffect(() => {
    void dispatch(fetchEngineStatus());
    void dispatch(fetchEngineDecisions());
  }, [dispatch]);

  const handleManualRun = async () => {
    setRunning(true);
    setRunError(null);
    try {
      // 409 = ריצה אחרת פעילה כרגע (השרת מחזיר את אותו מבנה עם started=false) - מטופל ב-thunk
      setLastRun(await dispatch(runMatchingEngine()).unwrap());
      await dispatch(fetchEngineStatus());
      await dispatch(fetchEngineDecisions());
    } catch (err: unknown) {
      setRunError(errorMessage(err, 'שגיאה בהפעלת מנוע השידוכים.'));
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <LoadingBlock text="טוען נתוני מנוע שידוכים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="מנוע השידוכים"
        subtitle="מעקב אחר ריצות אוטומטיות, אילוצים, חישובי ציון והרצה ידנית."
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {lastRun && <Alert severity={lastRun.started ? 'success' : 'warning'} sx={{ mb: 3 }}>{lastRun.message}</Alert>}

      <Card sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography><strong>סטטוס מנוע:</strong></Typography>
          <Chip size="small" color={engineStatus?.status === 'Running' ? 'warning' : 'primary'}
            label={engineStatus?.status === 'Running' ? 'רץ כעת' : 'ממתין לריצה הבאה'} />
        </Box>
        <Typography sx={{ mb: 1 }}>
          <strong>ריצה אחרונה:</strong> {engineStatus?.lastRunTime ?? '—'}
          {engineStatus?.lastRunTrigger && ` (${engineStatus.lastRunTrigger === 'Manual' ? 'ידנית' : engineStatus.lastRunTrigger === 'Scheduled' ? 'מתוזמנת' : engineStatus.lastRunTrigger})`}
          {engineStatus?.lastRunDurationSeconds != null && ` · ${engineStatus.lastRunDurationSeconds} שניות`}
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <strong>בריצה האחרונה:</strong> {engineStatus?.donationsProcessed ?? 0} תרומות נבדקו · {engineStatus?.routesCreated ?? 0} מסלולים · {engineStatus?.matchedCount ?? 0} תרומות שובצו
        </Typography>
        <Typography sx={{ mb: 1 }}>
          <strong>עכשיו:</strong> {engineStatus?.pendingDonations ?? 0} תרומות ממתינות · {engineStatus?.awaitingVolunteerResponse ?? 0} בקשות ממתינות לתגובת מתנדב · {engineStatus?.activeAssignments ?? 0} שיבוצים פעילים
        </Typography>
        <Typography color="text.secondary"><strong>תזמון:</strong> {engineStatus?.schedule ?? '—'} (cron)</Typography>

        <Button
          variant="contained"
          size="large"
          disabled={running}
          onClick={handleManualRun}
          startIcon={running ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
          sx={{ mt: 3 }}
        >
          {running ? 'מריץ אלגוריתם...' : 'הפעל מנוע שידוכים ידנית'}
        </Button>
      </Card>

      {/* תיקון 75: "למה המנוע החליט כך" */}
      <Card sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 0.5 }}>החלטות אחרונות של המנוע</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          לכל מסלול: מי נשקל, איך נבנה הציון, ולמה דווקא המתנדב הזה.
        </Typography>
        {decisions === null ? (
          <Typography color="text.secondary">טוען...</Typography>
        ) : decisions.length === 0 ? (
          <Typography color="text.secondary">עוד אין החלטות עם הסבר. הן יופיעו כאן אחרי הריצה הבאה של המנוע.</Typography>
        ) : (
          <ul className="dc-list" dir="rtl">
            {decisions.map((d) => (
              <li key={d.routeId}>
                <RouterLink to={`/app/admin/decisions/${d.routeId}`}>
                  <span className="dc-mini-ring" style={{ '--v': Math.round(d.matchScore) } as React.CSSProperties}>
                    <span>{Math.round(d.matchScore)}</span>
                  </span>
                  <span>
                    <span className="dc-list-title">
                      {d.volunteerName ?? 'מתנדב'} ← {d.donationIds.map((id) => `#${id}`).join(', ')}
                    </span>
                    <span className="dc-list-sub" style={{ display: 'block' }}>
                      {d.ngoName ? `אל ${d.ngoName} · ` : ''}{d.weightKg} ק"ג · {d.volunteersConsidered} מתנדבים נשקלו · {MODE_LABELS[d.mode] ?? d.mode}
                    </span>
                  </span>
                  <span className="dc-list-side">
                    {formatDateTime(d.decidedAt)}
                    <span className="dc-why">למה? ←</span>
                  </span>
                </RouterLink>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" sx={{ mb: 1 }}>אילוצים קשים שנכשלו</Typography>
        {(!engineStatus || engineStatus.failedConstraints.length === 0) ? (
          <Typography color="text.secondary">אין כשלים באילוצים בריצה האחרונה.</Typography>
        ) : (
          <List dense>
            {engineStatus.failedConstraints.map((item: string) => (
              <ListItem key={item} disableGutters>
                <ListItemIcon sx={{ minWidth: 36, color: 'error.main' }}>
                  <ErrorOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </Box>
  );
}
