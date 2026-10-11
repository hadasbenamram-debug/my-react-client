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

interface EngineStatus {
  lastRunTime: string;
  status: string;
  matchedCount: number;
  failedConstraints: string[];
}

export function AdminMatchingEnginePage() {
  const [engineStatus, setEngineStatus] = useState<EngineStatus>({
    lastRunTime: 'לא ידוע',
    status: 'Ready',
    matchedCount: 0,
    failedConstraints: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [running, setRunning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEngineStatus = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      // שימוש בנתיב המעודכן תחת matches
      const res = await fetch('/api/matches/engine-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('שגיאה בטעינת הנתונים מהשרת');
      const data = await res.json();
      setEngineStatus(data);
    } catch (err: any) {
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
      const token = localStorage.getItem('token') || localStorage.getItem('jwt');
      // שימוש בנתיב המעודכן תחת matches
      const res = await fetch('/api/matches/run-engine', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        alert('ריצת מנוע השידוכים בוצעה בהצלחה!');
        await fetchEngineStatus();
      } else {
        throw new Error('שגיאה בהפעלת מנוע השידוכים בשרת.');
      }
    } catch (err: any) {
      console.error('שגיאת תקשורת:', err);
      setError('שגיאה בהפעלת מנוע השידוכים. בדוק את חיבור השרת.');
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

      <Card sx={{ p: { xs: 3, md: 4 }, mb: 3 }}>
        <Typography sx={{ mb: 1.5 }}><strong>ריצה אחרונה:</strong> {engineStatus.lastRunTime}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Typography><strong>סטטוס מנוע:</strong></Typography>
          <Chip size="small" color="primary" label={engineStatus.status} />
        </Box>
        <Typography><strong>שידוכים שבוצעו בריצה האחרונה:</strong> {engineStatus.matchedCount}</Typography>

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
        {(!engineStatus.failedConstraints || engineStatus.failedConstraints.length === 0) ? (
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
