import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PageTitle from '../components/PageTitle.jsx';
import { StatusAlert } from '../components/FormParts.jsx';

interface AvailabilitySlot {
  day: number;
  startTime: string;
  endTime: string;
  regionId: number;
  toRegionId: number;
}

interface RegionOption {
  id: number;
  regionName?: string;
  name?: string;
}

const daysOfWeek = [
  { label: 'ראשון', value: 0 },
  { label: 'שני', value: 1 },
  { label: 'שלישי', value: 2 },
  { label: 'רביעי', value: 3 },
  { label: 'חמישי', value: 4 },
  { label: 'שישי', value: 5 },
  { label: 'שבת', value: 6 },
];

export const WeeklyAvailabilityPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא התחבר מחדש למערכת.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // שליפת רשימת האזורים מהשרת
        const regionsRes = await axios.get(`/api/region`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (regionsRes.data && Array.isArray(regionsRes.data)) {
          setRegions(regionsRes.data);
        }

        // שליפת נתוני הזמינות הקיימים של המתנדב
        const response = await axios.get(`/api/volunteers/availability`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setAvailabilitySlots(response.data.map((slot: any) => ({
            day: slot.day ?? 0,
            startTime: slot.startTime ? slot.startTime.substring(0, 5) : '08:00',
            endTime: slot.endTime ? slot.endTime.substring(0, 5) : '16:00',
            regionId: slot.regionId ?? (regionsRes.data[0]?.id || 1),
            toRegionId: slot.toRegionId ?? 0
          })));
        } else {
          setAvailabilitySlots([
            { day: 0, startTime: '08:00', endTime: '16:00', regionId: regionsRes.data[0]?.id || 1, toRegionId: 0 }
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError('שגיאה בטעינת הנתונים מהשרת.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddSlot = () => {
    setAvailabilitySlots([
      ...availabilitySlots,
      { day: 0, startTime: '08:00', endTime: '16:00', regionId: regions[0]?.id || 1, toRegionId: 0 }
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    const updated = availabilitySlots.filter((_, i) => i !== index);
    setAvailabilitySlots(updated);
  };

  const handleSlotChange = (index: number, field: keyof AvailabilitySlot, value: any) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    try {
      await axios.post(`/api/volunteers/availability`, availabilitySlots, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccessMessage('הזמינות נשמרה בהצלחה!');
    } catch (err: any) {
      console.error('Error saving availability:', err);
      setError(err.response?.data?.message || 'שגיאה בשמירת הנתונים. נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && availabilitySlots.length === 0) {
    return (
      <Box sx={{ maxWidth: 720, mx: 'auto' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="מתנדב"
        title="ניהול זמינות"
        subtitle="הגדירו את ימי ושעות הזמינות שלכם להתנדבות."
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          {availabilitySlots.map((slot, index) => (
            <Box
              key={index}
              sx={{ p: 2.5, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 500 }}>משבצת {index + 1}</Typography>
                <Tooltip title="מחק משבצת זו" arrow>
                  <IconButton size="small" onClick={() => handleRemoveSlot(index)} aria-label="מחק משבצת">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                <TextField
                  select
                  label="יום בשבוע"
                  value={slot.day}
                  onChange={(e) => handleSlotChange(index, 'day', parseInt(e.target.value))}
                >
                  {daysOfWeek.map((d) => (
                    <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="משעה"
                  type="time"
                  value={slot.startTime}
                  onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  label="עד שעה"
                  type="time"
                  value={slot.endTime}
                  onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />

                <TextField
                  select
                  label="אזור פעילות"
                  value={slot.regionId}
                  onChange={(e) => handleSlotChange(index, 'regionId', parseInt(e.target.value))}
                >
                  {regions.map((reg) => (
                    <MenuItem key={reg.id} value={reg.id}>
                      {reg.regionName || reg.name || `אזור ${reg.id}`}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>
          ))}

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 3 }}>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddSlot}>
              הוסף משבצת זמינות
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </Box>
        </form>

        {error && <StatusAlert message={error} success={false} />}
        {successMessage && <StatusAlert message={successMessage} success />}
      </Card>
    </Box>
  );
};