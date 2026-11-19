import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockResetIcon from '@mui/icons-material/LockReset';
import PageTitle from '../components/PageTitle';
import { FormSection } from '../components/FormParts';
import { LoadingBlock } from '../components/PageParts';
import type { SystemSettingsDto } from '../types/api';
import { errorMessage } from '../api/http';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchSystemSettings, isFirstLoad, saveSystemSettings, selectSystemSettings } from '../store/adminSlice';

// הגדרות מנוע השידוכים. תוקן: (1) הכתובת הייתה https://localhost:7295 קבועה - עכשיו נתיב יחסי;
// (2) ההגדרות נשמרו בזיכרון השרת ולא השפיעו על המנוע - עכשיו הן נשמרות במסד והמנוע משתמש בהן מהריצה הבאה.

type Key = keyof SystemSettingsDto;

const FIELDS: { section: string; items: { key: Key; label: string; step?: number; min?: number; max?: number; helper?: string }[] }[] = [
  {
    section: 'זמנים',
    items: [
      { key: 'matchingTimeoutMinutes', label: 'זמן לאישור בקשה (דקות)', min: 1, max: 120, helper: 'אחרי הזמן הזה הבקשה עוברת למתנדב הבא' },
      { key: 'autoNoShowGraceMinutes', label: 'No-Show אוטומטי אחרי (דקות)', min: 0, max: 600, helper: 'מעבר לזמן ההגעה המשוער בלי איסוף. 0 = כבוי' },
      { key: 'averageSpeedKmH', label: 'מהירות ממוצעת להערכה (קמ"ש)', min: 5, max: 120, step: 1, helper: 'כש-Google לא זמין' },
    ],
  },
  {
    section: 'משקלי הציון (סכום חיובי)',
    items: [
      { key: 'distanceWeight', label: 'מרחק', step: 0.05, min: 0, max: 1 },
      { key: 'urgencyWeight', label: 'דחיפות המזון', step: 0.05, min: 0, max: 1 },
      { key: 'capacityWeight', label: 'קיבולת הרכב', step: 0.05, min: 0, max: 1 },
      { key: 'reliabilityWeight', label: 'אמינות המתנדב', step: 0.05, min: 0, max: 1 },
    ],
  },
  {
    section: 'חיפוש ומסלולים',
    items: [
      { key: 'maxSearchRadiusKm', label: 'רדיוס חיפוש מתנדבים (ק"מ)', step: 1, min: 1, max: 200 },
      { key: 'clusterRadiusKm', label: 'רדיוס איסוף תחנות נוספות (ק"מ)', step: 1, min: 0.5, max: 100 },
      { key: 'maxRoutesEvaluatedPerDonation', label: 'מסלולים לבדיקה לכל תרומה', min: 1, max: 50 },
      { key: 'maxItemsPerCategory', label: 'מקסימום תרומות מאותה קטגוריה במסלול', min: 1, max: 50 },
      { key: 'noShowReliabilityPenalty', label: 'הורדה בציון האמינות על No-Show', step: 0.1, min: 0, max: 4 },
    ],
  },
];

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settingsState = useAppSelector(selectSystemSettings);
  const loading = isFirstLoad(settingsState, settingsState.item !== null);
  // הטופס עצמו - עותק מקומי של ההגדרות מהסלייס, שהמנהל עורך עד השמירה
  const [settings, setSettings] = useState<SystemSettingsDto | null>(settingsState.item);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void dispatch(fetchSystemSettings());
  }, [dispatch]);

  // הגדרות חדשות מהשרת (טעינה או שמירה) - ממלאים את הטופס
  useEffect(() => {
    if (settingsState.item) setSettings(settingsState.item);
  }, [settingsState.item]);

  // שגיאת טעינה מוצגת באותה הודעה כמו קודם
  const shownStatus = status ?? (settingsState.error && !settingsState.item ? { ok: false, text: settingsState.error } : null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => (prev ? { ...prev, [name]: value === '' ? null : Number(value) } : prev));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setStatus(null);
    try {
      // ההגדרות השמורות מהשרת נכנסות לסלייס, ומשם לטופס
      await dispatch(saveSystemSettings(settings)).unwrap();
      setStatus({ ok: true, text: 'ההגדרות נשמרו ויחולו מהריצה הבאה של המנוע.' });
    } catch (err) {
      setStatus({ ok: false, text: errorMessage(err, 'שגיאה בשמירת ההגדרות.') });
    }
  };

  if (loading) return <LoadingBlock text="טוען הגדרות מערכת..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="הגדרות מערכת"
        subtitle="פרמטרים של מנוע השידוכים: זמני תגובה, משקלי הציון וטווחי חיפוש."
      />

      {shownStatus && <Alert severity={shownStatus.ok ? 'success' : 'error'} sx={{ mb: 2 }}>{shownStatus.text}</Alert>}

      {settings && (
        <Card sx={{ p: { xs: 3, md: 5 } }}>
          <form onSubmit={handleSave}>
            {FIELDS.map((group) => (
              <Box key={group.section} sx={{ mb: 3 }}>
                <FormSection title={group.section} columns={2}>
                  {group.items.map((f) => (
                    <TextField
                      key={f.key}
                      label={f.label}
                      type="number"
                      name={f.key}
                      value={settings[f.key] ?? ''}
                      onChange={handleChange}
                      helperText={f.helper}
                      slotProps={{ htmlInput: { step: f.step ?? 1, min: f.min, max: f.max } }}
                    />
                  ))}
                </FormSection>
              </Box>
            ))}
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ mt: 2 }}>
              שמור הגדרות
            </Button>
          </form>
        </Card>
      )}

      {/* המנהל מחליף את הסיסמה שלו כמו כל משתמש - בעמוד הפרופיל האישי (api/auth/change-password) */}
      <Card sx={{ p: { xs: 3, md: 4 }, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>אבטחת החשבון שלך</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          החלפת הסיסמה של חשבון המנהל. אחרי ההחלפה כל החיבורים בשאר המכשירים מתנתקים.
        </Typography>
        <Button variant="outlined" startIcon={<LockResetIcon />} onClick={() => navigate('/app/profile#password')}>
          לשינוי הסיסמה
        </Button>
      </Card>
    </Box>
  );
}
