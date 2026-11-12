import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PageTitle from '../components/PageTitle';
import { getApiErrorMessage } from '../utils/apiError';
import type { AvailabilitySlotResponseDto } from '../types/api';
import { getToken } from '../utils/auth';

// תיקון 54: ניהול הזמינות כטבלה שבועית - עמודה לכל יום (ראשון עד שישי ומוצאי שבת).
// לחיצה על יום (או על שעה בתוך היום) פותחת חלון להוספת זמינות לאותו יום, ולחיצה על משבצת קיימת - עריכה או מחיקה.
// כל שינוי נשמר מיד בשרת (אותו POST api/volunteers/availability כמו קודם - הרשימה המלאה).
// בטלפון: אותה טבלה בשורות - שורה לכל יום.

interface AvailabilitySlot {
  /** מזהה מקומי לרשימה בלבד (לא נשלח לשרת) */
  key: number;
  day: number;
  startTime: string;
  endTime: string;
  regionId: number;
  /** 0 = אותו אזור (לא נוסע לאזור אחר) */
  toRegionId: number;
}

type SlotDraft = Omit<AvailabilitySlot, 'key'>;

interface RegionOption {
  id: number;
  regionName?: string;
  name?: string;
}

interface EditorState {
  /** null = משבצת חדשה */
  key: number | null;
  draft: SlotDraft;
  /** בהוספה: ימים נוספים שיקבלו את אותן שעות */
  alsoDays: number[];
}

// בשבת עצמה אין שיבוצים. יום 6 הוא מוצאי שבת: משבצת בו מתחילה לכל המוקדם ב-17:00 (השרת בודק את אותו דבר),
// ומנוע השידוכים שולח הצעות רק אחרי צאת השבת. בשישי ההצעות נשלחות רק עד כניסת השבת.
const FRIDAY = 5;
const SATURDAY_NIGHT = 6;
const SATURDAY_NIGHT_EARLIEST = '17:00';

const DAYS = [
  { value: 0, label: 'ראשון', short: 'א׳' },
  { value: 1, label: 'שני', short: 'ב׳' },
  { value: 2, label: 'שלישי', short: 'ג׳' },
  { value: 3, label: 'רביעי', short: 'ד׳' },
  { value: 4, label: 'חמישי', short: 'ה׳' },
  { value: FRIDAY, label: 'שישי', short: 'ו׳' },
  { value: SATURDAY_NIGHT, label: 'מוצ"ש', short: 'מוצ"ש' },
];

const dayName = (day: number) => (day === SATURDAY_NIGHT ? 'מוצאי שבת' : `יום ${DAYS[day]?.label ?? ''}`);

const dayNote = (day: number) =>
  day === SATURDAY_NIGHT ? 'מ-17:00, אחרי צאת השבת'
    : day === FRIDAY ? 'הצעות עד כניסת השבת'
      : null;

// שעות מוכנות לבחירה מהירה
const PRESETS: Record<'weekday' | 'saturdayNight', { label: string; start: string; end: string }[]> = {
  weekday: [
    { label: 'בוקר', start: '08:00', end: '12:00' },
    { label: 'צהריים', start: '12:00', end: '16:00' },
    { label: 'אחה"צ', start: '16:00', end: '20:00' },
    { label: 'ערב', start: '19:00', end: '23:00' },
  ],
  saturdayNight: [
    { label: 'מוצ"ש מוקדם', start: '18:00', end: '21:00' },
    { label: 'מוצ"ש', start: '20:00', end: '23:00' },
  ],
};

const HOUR_PX = 38;
const DEFAULT_FIRST_HOUR = 6;
const LAST_HOUR = 24;

const toMinutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const fromMinutes = (minutes: number) => {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
};

/** טווח שעות בתוך טקסט עברי - בבידוד LTR, כדי ש-"08:00–12:00" לא יתהפך ל-"12:00–08:00" */
const timeRange = (start: string, end: string) => `\u2066${start}–${end}\u2069`;

// בחירת שעה בפורמט 24 שעות (שדה time של הדפדפן מציג AM/PM לפי הגדרות המחשב). כל חצי שעה.
const HALF_HOURS = Array.from({ length: 48 }, (_, i) => fromMinutes(i * 30));
const startOptions = (day: number, current: string) => {
  const list = day === SATURDAY_NIGHT ? HALF_HOURS.filter((t) => t >= SATURDAY_NIGHT_EARLIEST) : HALF_HOURS;
  return list.includes(current) ? list : [...list, current].sort();
};
const endOptions = (current: string) => {
  const list = [...HALF_HOURS.slice(1), '23:59'];
  return list.includes(current) ? list : [...list, current].sort();
};
const TIME_MENU = { MenuProps: { slotProps: { paper: { sx: { maxHeight: 320 } } } } };

const durationHours = (slot: SlotDraft) => Math.max(0, toMinutes(slot.endTime) - toMinutes(slot.startTime)) / 60;

const formatHours = (hours: number) =>
  `${hours.toLocaleString('he-IL', { maximumFractionDigits: 1 })} ${hours === 1 ? 'שעה' : 'שעות'}`;

const startsTooEarlyOnSaturday = (slot: SlotDraft) =>
  slot.day === SATURDAY_NIGHT && slot.startTime < SATURDAY_NIGHT_EARLIEST;

const overlaps = (a: SlotDraft, b: SlotDraft) =>
  a.day === b.day && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);

/** שגיאה במשבצת (אותם כללים שהשרת בודק), או null */
const validateDraft = (slot: SlotDraft): string | null => {
  if (!slot.startTime || !slot.endTime) return 'יש לבחור שעת התחלה ושעת סיום.';
  if (slot.startTime >= slot.endTime) return 'שעת ההתחלה חייבת להיות לפני שעת הסיום.';
  if (startsTooEarlyOnSaturday(slot)) return `בשבת אפשר להגדיר זמינות רק במוצאי שבת, משעה ${SATURDAY_NIGHT_EARLIEST} ואילך.`;
  if (slot.toRegionId !== 0 && slot.toRegionId === slot.regionId) return 'אזור היעד צריך להיות שונה מאזור הפעילות.';
  return null;
};

/** משבצות חופפות באותו יום מוצגות זו לצד זו */
const layoutDay = (slots: AvailabilitySlot[]) => {
  const sorted = [...slots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const laneEnds: number[] = [];
  const lanes = new Map<number, number>();
  sorted.forEach((slot) => {
    let lane = laneEnds.findIndex((end) => end <= toMinutes(slot.startTime));
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = toMinutes(slot.endTime);
    lanes.set(slot.key, lane);
  });
  return { lanes, laneCount: Math.max(1, laneEnds.length) };
};

let nextKey = 1;

export const WeeklyAvailabilityPage: React.FC = () => {
  const theme = useTheme();
  const narrow = useMediaQuery(theme.breakpoints.down('md'));

  const [loading, setLoading] = useState<boolean>(true);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  const today = new Date().getDay();   // 0 = ראשון ... 6 = שבת (מוצ"ש)

  useEffect(() => {
    // תוקן: בעבר טוקן מהכתובת נשמר כטוקן התחברות. עכשיו רק הטוקן מההתחברות.
    const token = getToken();
    if (!token) {
      setLoadError('לא נמצא טוקן התחברות. אנא התחבר מחדש למערכת.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [regionsRes, slotsRes] = await Promise.all([
          axios.get<RegionOption[]>('/api/region', { headers }),
          axios.get<AvailabilitySlotResponseDto[]>('/api/volunteers/availability', { headers }),
        ]);
        const regionList = Array.isArray(regionsRes.data) ? regionsRes.data : [];
        setRegions(regionList);
        setSlots((Array.isArray(slotsRes.data) ? slotsRes.data : []).map((slot) => ({
          key: nextKey++,
          day: slot.day ?? 0,
          startTime: slot.startTime ? slot.startTime.substring(0, 5) : '08:00',
          endTime: slot.endTime ? slot.endTime.substring(0, 5) : '12:00',
          regionId: slot.regionId ?? (regionList[0]?.id || 1),
          toRegionId: slot.toRegionId ?? 0,
        })));
      } catch (err: unknown) {
        console.error('Error fetching data:', err);
        setLoadError('שגיאה בטעינת הנתונים מהשרת.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const regionName = (id: number) => {
    const region = regions.find((r) => r.id === id);
    return region?.regionName || region?.name || `אזור ${id}`;
  };

  const slotsByDay = useMemo(() => DAYS.map((d) => slots
    .filter((s) => s.day === d.value)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))), [slots]);

  const totalHours = slots.reduce((sum, s) => sum + durationHours(s), 0);
  const activeDays = slotsByDay.filter((list) => list.length > 0).length;

  const firstHour = Math.min(DEFAULT_FIRST_HOUR, ...slots.map((s) => Math.floor(toMinutes(s.startTime) / 60)));
  const hours = Array.from({ length: LAST_HOUR - firstHour }, (_, i) => firstHour + i);

  // ── שמירה: כל שינוי נשלח מיד (הרשימה המלאה, ממוינת לפי יום ושעה) ──
  const persist = async (next: AvailabilitySlot[], successText: string): Promise<boolean> => {
    const ordered = [...next].sort((a, b) => a.day - b.day || toMinutes(a.startTime) - toMinutes(b.startTime));
    setSaving(true);
    try {
      await axios.post('/api/volunteers/availability',
        ordered.map(({ key: _key, ...s }) => ({ ...s, toRegionId: s.toRegionId === 0 ? null : s.toRegionId })),
        { headers: { Authorization: `Bearer ${getToken()}` } });
      setSlots(next);
      setToast(successText);
      return true;
    } catch (err: unknown) {
      console.error('Error saving availability:', err);
      // השרת מציין "משבצת N" לפי הסדר שנשלח - מתרגמים ליום ולשעות
      const message = (getApiErrorMessage(err) || 'שגיאה בשמירת הנתונים. נסו שוב.')
        .replace(/משבצת (\d+)/g, (match, n: string) => {
          const slot = ordered[Number(n) - 1];
          return slot ? `${dayName(slot.day)} ${timeRange(slot.startTime, slot.endTime)}` : match;
        });
      setEditorError(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // ── חלון ההוספה / העריכה ──
  const openNew = (day: number, startMinutes?: number) => {
    const isSaturdayNight = day === SATURDAY_NIGHT;
    const lastRegion = slots.length > 0 ? slots[slots.length - 1].regionId : regions[0]?.id || 1;
    let startTime: string;
    let endTime: string;
    if (startMinutes === undefined) {
      // לחיצה על "הוספה": השעות המוכנות הראשונות שעוד לא תפוסות באותו יום
      const presetList = isSaturdayNight ? PRESETS.saturdayNight : PRESETS.weekday;
      const free = presetList.find((p) => !slots.some((s) => overlaps(s, { day, startTime: p.start, endTime: p.end, regionId: 0, toRegionId: 0 })));
      ({ start: startTime, end: endTime } = free ?? presetList[0]);
    } else {
      // לחיצה על שעה בתוך היום: מתחילים בשעה הזאת
      let start = startMinutes;
      if (isSaturdayNight && start < toMinutes(SATURDAY_NIGHT_EARLIEST)) start = 20 * 60;
      startTime = fromMinutes(start);
      endTime = fromMinutes(Math.min(start + (isSaturdayNight ? 3 : 4) * 60, 23 * 60 + 59));
    }
    setEditorError(null);
    setEditor({ key: null, draft: { day, startTime, endTime, regionId: lastRegion, toRegionId: 0 }, alsoDays: [] });
  };

  const openEdit = (slot: AvailabilitySlot) => {
    const { key, ...draft } = slot;
    setEditorError(null);
    setEditor({ key, draft, alsoDays: [] });
  };

  const updateDraft = <K extends keyof SlotDraft>(field: K, value: SlotDraft[K]) => {
    if (!editor) return;
    const draft = { ...editor.draft, [field]: value };
    // מעבר למוצאי שבת: אם השעות שנבחרו הן של שבת עצמה - מציעים שעות של מוצאי שבת
    if (field === 'day' && startsTooEarlyOnSaturday(draft)) {
      draft.startTime = '20:00';
      if (draft.endTime <= draft.startTime) draft.endTime = '23:00';
    }
    if (field === 'regionId' && draft.toRegionId === draft.regionId) draft.toRegionId = 0;
    setEditorError(null);
    setEditor({ ...editor, draft, alsoDays: editor.alsoDays.filter((d) => d !== draft.day) });
  };

  const toggleAlsoDay = (day: number) => {
    if (!editor) return;
    const alsoDays = editor.alsoDays.includes(day) ? editor.alsoDays.filter((d) => d !== day) : [...editor.alsoDays, day];
    setEditor({ ...editor, alsoDays });
  };

  const saveEditor = async () => {
    if (!editor) return;
    const drafts: SlotDraft[] = [editor.draft, ...editor.alsoDays.map((day) => ({ ...editor.draft, day }))];
    for (const draft of drafts) {
      const problem = validateDraft(draft);
      if (problem) {
        setEditorError(`${dayName(draft.day)}: ${problem}`);
        return;
      }
    }
    const kept = slots.filter((s) => s.key !== editor.key);
    const added = drafts.map((draft, i) => ({ ...draft, key: i === 0 && editor.key !== null ? editor.key : nextKey++ }));
    const text = editor.key !== null ? 'השינוי נשמר.'
      : drafts.length > 1 ? `נוספה זמינות ב-${drafts.length} ימים.` : `נוספה זמינות ב${dayName(editor.draft.day)}.`;
    if (await persist([...kept, ...added], text)) setEditor(null);
  };

  const deleteEditorSlot = async () => {
    if (!editor || editor.key === null) return;
    if (await persist(slots.filter((s) => s.key !== editor.key), 'המשבצת נמחקה.')) setEditor(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{loadError}</Alert>
      </Box>
    );
  }

  const draft = editor?.draft;
  const draftProblem = draft ? validateDraft(draft) : null;
  const overlapping = draft ? slots.filter((s) => s.key !== editor?.key && overlaps(s, draft)) : [];
  const presets = draft?.day === SATURDAY_NIGHT ? PRESETS.saturdayNight : PRESETS.weekday;

  // ── משבצת בטבלה ──
  const slotLabel = (slot: AvailabilitySlot) => (
    <>
      {/* dir כמאפיין (ולא ב-sx): תוסף ה-RTL של העיצוב הופך direction / textAlign שנכתבים ב-sx */}
      <Box component="span" dir="ltr" sx={{ display: 'inline-block', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
        {slot.startTime}–{slot.endTime}
      </Box>
      <Box component="span" sx={{ display: 'block', opacity: 0.8 }}>
        {regionName(slot.regionId)}{slot.toRegionId ? ` ← ${regionName(slot.toRegionId)}` : ''}
      </Box>
    </>
  );

  // ── מחשב: לוח שבועי עם שעות ──
  const weekGrid = (
    <Box sx={{ display: 'grid', gridTemplateColumns: '52px repeat(7, minmax(0, 1fr))' }}>
      {/* כותרות הימים */}
      <Box />
      {DAYS.map((d, i) => {
        const isToday = d.value === today;
        const dayHours = slotsByDay[i].reduce((sum, s) => sum + durationHours(s), 0);
        return (
          <Box key={d.value} sx={{ px: 0.75, pb: 1.25, textAlign: 'center', borderBottom: '2px solid', borderColor: isToday ? 'primary.main' : 'divider' }}>
            <Typography sx={{ fontWeight: 500, fontSize: '1.05rem', color: isToday ? 'primary.dark' : 'text.primary' }}>
              {d.label}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', minHeight: '1.6em', lineHeight: 1.3 }}>
              {dayHours > 0 ? formatHours(dayHours) : dayNote(d.value) ?? (isToday ? 'היום' : ' ')}
            </Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={() => openNew(d.value)} sx={{ mt: 0.5, minWidth: 0, px: 1.25 }}>
              הוספה
            </Button>
          </Box>
        );
      })}

      {/* עמודת השעות */}
      <Box sx={{ position: 'relative', height: hours.length * HOUR_PX }}>
        {hours.map((h, i) => (
          <Typography key={h} variant="caption" color="text.secondary"
            sx={{ position: 'absolute', top: i * HOUR_PX - 9, insetInlineEnd: 8, direction: 'ltr', fontVariantNumeric: 'tabular-nums' }}>
            {String(h).padStart(2, '0')}:00
          </Typography>
        ))}
      </Box>

      {/* עמודות הימים */}
      {DAYS.map((d, i) => {
        const { lanes, laneCount } = layoutDay(slotsByDay[i]);
        const shabbatHeight = d.value === SATURDAY_NIGHT
          ? Math.max(0, (toMinutes(SATURDAY_NIGHT_EARLIEST) / 60 - firstHour) * HOUR_PX) : 0;
        return (
          <Box
            key={d.value}
            title={`לחיצה להוספת זמינות ב${dayName(d.value)}`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const minutes = firstHour * 60 + Math.floor(((e.clientY - rect.top) / HOUR_PX) * 2) * 30;
              openNew(d.value, minutes);
            }}
            sx={{
              position: 'relative',
              height: hours.length * HOUR_PX,
              borderInlineStart: '1px solid',
              borderColor: 'divider',
              cursor: 'copy',
              bgcolor: d.value === today ? 'rgba(27, 191, 196, 0.05)' : 'transparent',
              backgroundImage: `repeating-linear-gradient(to bottom, rgba(0,0,0,0.07) 0 1px, transparent 1px ${HOUR_PX}px)`,
              '&:hover': { bgcolor: 'rgba(27, 191, 196, 0.08)' },
            }}
          >
            {shabbatHeight > 0 && (
              <Box sx={{
                position: 'absolute', top: 0, left: 0, right: 0, height: shabbatHeight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundImage: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.05) 0 8px, transparent 8px 16px)',
                color: 'text.secondary', fontSize: '0.85rem', pointerEvents: 'none',
              }}>
                שבת
              </Box>
            )}
            {slotsByDay[i].map((slot) => {
              const top = (toMinutes(slot.startTime) / 60 - firstHour) * HOUR_PX;
              const height = Math.max(26, durationHours(slot) * HOUR_PX);
              const lane = lanes.get(slot.key) ?? 0;
              return (
                <Tooltip key={slot.key} title="לחיצה לעריכה או למחיקה" arrow placement="top">
                  <Box
                    component="button"
                    type="button"
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); openEdit(slot); }}
                    sx={{
                      position: 'absolute',
                      top: top + 1,
                      height: height - 2,
                      insetInlineStart: `calc(${(lane / laneCount) * 100}% + 3px)`,
                      width: `calc(${100 / laneCount}% - 6px)`,
                      p: '4px 7px',
                      overflow: 'hidden',
                      border: 0,
                      borderInlineStart: '4px solid',
                      borderColor: 'primary.dark',
                      borderRadius: '10px',
                      bgcolor: 'primary.main',
                      color: 'text.primary',
                      font: 'inherit',
                      fontSize: laneCount > 1 ? '0.7rem' : '0.78rem',
                      lineHeight: 1.35,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      justifyContent: 'flex-start',
                      textAlign: 'start',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      '&:hover, &:focus-visible': { transform: 'translateY(-1px)', boxShadow: '0 6px 14px rgba(0,0,0,0.18)', outline: 'none' },
                    }}
                  >
                    {slotLabel(slot)}
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        );
      })}
    </Box>
  );

  // ── טלפון: שורה לכל יום ──
  const dayRows = (
    <Box>
      {DAYS.map((d, i) => {
        const isToday = d.value === today;
        return (
          <Box key={d.value} sx={{ py: 1.75, borderBottom: i < DAYS.length - 1 ? '1px solid' : 0, borderColor: 'divider' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 500, color: isToday ? 'primary.dark' : 'text.primary' }}>
                  {d.value === SATURDAY_NIGHT ? 'מוצאי שבת' : d.label}{isToday ? ' · היום' : ''}
                </Typography>
                {dayNote(d.value) && <Typography variant="caption" color="text.secondary">{dayNote(d.value)}</Typography>}
              </Box>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => openNew(d.value)}>הוספה</Button>
            </Stack>
            {/* פס של היום (06:00-24:00) עם השעות הזמינות */}
            <Box sx={{ position: 'relative', height: 8, borderRadius: 4, bgcolor: 'rgba(0,0,0,0.07)', mb: slotsByDay[i].length ? 1.25 : 0, overflow: 'hidden' }}>
              {slotsByDay[i].map((slot) => (
                <Box key={slot.key} sx={{
                  position: 'absolute', top: 0, bottom: 0, bgcolor: 'primary.main',
                  insetInlineStart: `${Math.max(0, (toMinutes(slot.startTime) / 60 - firstHour) / (LAST_HOUR - firstHour)) * 100}%`,
                  width: `${(durationHours(slot) / (LAST_HOUR - firstHour)) * 100}%`,
                }} />
              ))}
            </Box>
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {slotsByDay[i].map((slot) => (
                <Box key={slot.key} component="button" type="button" onClick={() => openEdit(slot)}
                  sx={{
                    p: '6px 12px', border: 0, borderInlineStart: '4px solid', borderColor: 'primary.dark', borderRadius: '10px',
                    bgcolor: 'primary.main', color: 'text.primary', font: 'inherit', fontSize: '0.85rem', lineHeight: 1.35,
                    textAlign: 'start', cursor: 'pointer',
                  }}>
                  {slotLabel(slot)}
                </Box>
              ))}
            </Stack>
          </Box>
        );
      })}
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1180, mx: 'auto' }}>
      <PageTitle
        eyebrow="מתנדב"
        title="ניהול זמינות"
        subtitle={narrow
          ? 'הלוח השבועי שלכם. לוחצים "הוספה" ליד היום כדי להוסיף זמינות, ועל משבצת קיימת כדי לערוך או למחוק. כל שינוי נשמר מיד.'
          : 'הלוח השבועי שלכם. לוחצים על יום - או על שעה בתוך היום - כדי להוסיף זמינות, ועל משבצת קיימת כדי לערוך או למחוק. כל שינוי נשמר מיד.'}
      />

      <Stack direction="row" sx={{ mb: 2, gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Chip color="primary" label={slots.length > 0 ? `${formatHours(totalHours)} בשבוע` : 'עוד אין זמינות'} />
        {slots.length > 0 && <Chip variant="outlined" label={`${activeDays} ${activeDays === 1 ? 'יום' : 'ימים'} · ${slots.length} משבצות`} />}
        {saving && <Chip variant="outlined" label="שומר..." icon={<CircularProgress size={14} />} />}
      </Stack>

      {slots.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          כדי לקבל הצעות התנדבות, הוסיפו לפחות משבצת זמינות אחת: בוחרים יום, שעות ואזור. בשבת אין שיבוצים - אפשר להגדיר זמינות במוצאי שבת.
        </Alert>
      )}

      <Card sx={{ p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
        {narrow ? dayRows : weekGrid}
      </Card>

      {/* חלון ההוספה / העריכה */}
      <Dialog open={editor !== null} onClose={saving ? undefined : () => setEditor(null)} fullWidth maxWidth="sm">
        {editor && draft && (
          <>
            <DialogTitle>{editor.key === null ? `זמינות ב${dayName(draft.day)}` : `עריכת זמינות - ${dayName(draft.day)}`}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2.5}>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {presets.map((p) => {
                    const selected = draft.startTime === p.start && draft.endTime === p.end;
                    return (
                      <Chip key={p.label} clickable color={selected ? 'primary' : 'default'} variant={selected ? 'filled' : 'outlined'}
                        label={`${p.label} ${timeRange(p.start, p.end)}`}
                        onClick={() => { setEditorError(null); setEditor({ ...editor, draft: { ...draft, startTime: p.start, endTime: p.end } }); }} />
                    );
                  })}
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <TextField select label="יום" value={draft.day} onChange={(e) => updateDraft('day', Number(e.target.value))}>
                    {DAYS.map((d) => <MenuItem key={d.value} value={d.value}>{d.value === SATURDAY_NIGHT ? 'מוצאי שבת' : d.label}</MenuItem>)}
                  </TextField>
                  <TextField select label="משעה" value={draft.startTime}
                    onChange={(e) => updateDraft('startTime', e.target.value)}
                    error={startsTooEarlyOnSaturday(draft)}
                    helperText={draft.day === SATURDAY_NIGHT ? `משעה ${SATURDAY_NIGHT_EARLIEST} ואילך` : undefined}
                    slotProps={{ select: TIME_MENU }}>
                    {startOptions(draft.day, draft.startTime).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                  <TextField select label="עד שעה" value={draft.endTime}
                    onChange={(e) => updateDraft('endTime', e.target.value)}
                    error={draft.startTime >= draft.endTime}
                    slotProps={{ select: TIME_MENU }}>
                    {endOptions(draft.endTime).map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2 }}>
                  <TextField select label="אזור פעילות" value={draft.regionId} onChange={(e) => updateDraft('regionId', Number(e.target.value))}>
                    {regions.map((reg) => <MenuItem key={reg.id} value={reg.id}>{regionName(reg.id)}</MenuItem>)}
                  </TextField>
                  {/* נסיעה בין אזורים - המנוע ישבץ איסופים באזור המוצא למסירה באזור היעד */}
                  <TextField select label="נוסע/ת לאזור" value={draft.toRegionId}
                    onChange={(e) => updateDraft('toRegionId', Number(e.target.value))} helperText="לא חובה">
                    <MenuItem value={0}>אותו אזור</MenuItem>
                    {regions.filter((reg) => reg.id !== draft.regionId).map((reg) => (
                      <MenuItem key={reg.id} value={reg.id}>{regionName(reg.id)}</MenuItem>
                    ))}
                  </TextField>
                </Box>

                {editor.key === null && (
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>אותן שעות גם בימים:</Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {DAYS.filter((d) => d.value !== draft.day).map((d) => {
                        const on = editor.alsoDays.includes(d.value);
                        return (
                          <Chip key={d.value} clickable size="small" label={d.label}
                            color={on ? 'primary' : 'default'} variant={on ? 'filled' : 'outlined'}
                            onClick={() => toggleAlsoDay(d.value)} />
                        );
                      })}
                    </Stack>
                  </Box>
                )}

                {draft.day === FRIDAY && <Alert severity="info">בשישי הצעות נשלחות רק עד כניסת השבת.</Alert>}
                {draftProblem && !editorError && <Alert severity="warning">{draftProblem}</Alert>}
                {overlapping.length > 0 && !draftProblem && (
                  <Alert severity="info">
                    חופף למשבצת שכבר קיימת באותו יום ({overlapping.map((s) => timeRange(s.startTime, s.endTime)).join(', ')}).
                    אפשר לשמור, אבל בדרך כלל עדיף להרחיב את המשבצת הקיימת.
                  </Alert>
                )}
                {editorError && <Alert severity="error">{editorError}</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Box>
                {editor.key !== null && (
                  <IconButton color="error" onClick={() => void deleteEditorSlot()} disabled={saving} aria-label="מחיקת המשבצת">
                    <DeleteOutlineIcon />
                  </IconButton>
                )}
              </Box>
              <Stack direction="row" spacing={1}>
                <Button color="error" onClick={() => setEditor(null)} disabled={saving}>ביטול</Button>
                <Button variant="contained" onClick={() => void saveEditor()} disabled={saving || !!draftProblem}>
                  {saving ? 'שומר...' : editor.key === null ? 'הוספה ללוח' : 'שמירה'}
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Snackbar open={toast !== null} autoHideDuration={2500} onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setToast(null)}>{toast}</Alert>
      </Snackbar>
    </Box>
  );
};
