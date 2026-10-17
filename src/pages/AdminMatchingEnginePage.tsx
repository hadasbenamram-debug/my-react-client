import React, { useState, useEffect } from 'react';
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

import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import type { EngineRunResultDto, EngineStatusDto } from '../types/api';

// תוקן: engine-status החזיר ערכים קבועים, ו"הפעל מנוע" לא שמר כלום.
// עכשיו: הנתונים של הריצה האחרונה בפועל + מספרים מהמסד, וההפעלה הידנית היא אותה ריצה של המנוע המתוזמן.

export function AdminMatchingEnginePage() {
  const [engineStatus, setEngineStatus] = useState<EngineStatusDto | null>(null);
  const [lastRun, setLastRun] = useState<EngineRunResultDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEngineStatus = async () => {
    try {
      setError(null);
      const res = await fetch('/api/matches/engine-status', { headers: authHeaders() });
      if (!res.ok) throw new Error('שגיאה בטעינת הנתונים מהשרת');
      setEngineStatus((await res.json()) as EngineStatusDto);
    } catch (err: unknown) {
      console.error('שגיאה בטעינת סטטוס מנוע השידוכים:', err);
      setError('לא ניתן להתחבר לשרת או לטעון את נתוני המנוע. ודא שהשרת פועל.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEngineStatus();
  }, []);

  const handleManualRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch('/api/matches/run-engine', { method: 'POST', headers: authHeaders() });
      // 409 = ריצה אחרת פעילה כרגע (השרת מחזיר את אותו מבנה עם started=false)
      if (res.ok || res.status === 409) {
        setLastRun((await res.json()) as EngineRunResultDto);
        await fetchEngineStatus();
      } else {
        throw new Error(await readErrorMessage(res, 'שגיאה בהפעלת מנוע השידוכים בשרת.'));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהפעלת מנוע השידוכים.');
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

      <Card sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h6" sx={{ mb: 1 }}>אילוצים קשים שנכשלו</Typography>
        {(!engineStatus || engineStatus.failedConstraints.length === 0) ? (
          <Typography color="text.secondary">אין כשלים באילוצים בריצה האחרונה.</Typography>
        ) : (
          <List dense>
            {engineStatus.failedConstraints.map((item: string, index: number) => (
              <ListItem key={index} disableGutters>
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
