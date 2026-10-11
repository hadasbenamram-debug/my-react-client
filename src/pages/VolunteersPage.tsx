import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { FormSection } from '../components/FormParts';

interface VolunteerDto {
  id?: number;
  vehicleType: string;
  maxCapacityKg: number;
  isAvailable: boolean;
  currentLatitude: number;
  currentLongitude: number;
  idNumber: string;
  driverLicenseNumber: string; // הוספת שדה מספר רישיון
  dateOfBirth: string;
  reliabilityScore: number;
}

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [newVolunteer, setNewVolunteer] = useState<VolunteerDto>({
    vehicleType: 'רכב פרטי',
    maxCapacityKg: 50,
    isAvailable: true,
    currentLatitude: 32.0853,
    currentLongitude: 34.7818,
    idNumber: '',
    driverLicenseNumber: '', // ערך התחלתי ריק
    dateOfBirth: '1995-01-01T00:00:00',
    reliabilityScore: 100
  });

  const fetchVolunteers = () => {
    const token = localStorage.getItem('token');

    fetch('/api/volunteers', {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`שגיאת שרת: ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setVolunteers(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בשליפת מתנדבים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchVolunteers();
  }, []);

  const handleCreateVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    fetch('/api/volunteers', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify(newVolunteer)
    })
      .then(async res => {
        if (res.ok) {
          alert('המתנדב נוסף בהצלחה למסד הנתונים!');
          fetchVolunteers(); 
        } else {
          const errorText = await res.text();
          alert('שגיאה בשמירת המתנדב: ' + errorText);
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען מתנדבים מהשרת...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle eyebrow="ניהול מערכת" title="ניהול מתנדבים" subtitle="הוספת מתנדב ידנית וצפייה ברשימה הקיימת." />

      <Card sx={{ p: { xs: 3, md: 5 }, mb: 4 }}>
        <form onSubmit={handleCreateVolunteer}>
          <FormSection title="הוספת מתנדב חדש">
            <TextField
              label="סוג רכב"
              value={newVolunteer.vehicleType}
              onChange={(e) => setNewVolunteer({ ...newVolunteer, vehicleType: e.target.value })}
              required
            />
            <TextField
              label='קיבולת מקסימלית (ק"ג)'
              type="number"
              value={newVolunteer.maxCapacityKg}
              onChange={(e) => setNewVolunteer({ ...newVolunteer, maxCapacityKg: Number(e.target.value) })}
              required
            />
            <TextField
              label="תעודת זהות"
              value={newVolunteer.idNumber}
              onChange={(e) => setNewVolunteer({ ...newVolunteer, idNumber: e.target.value })}
              required
            />
            <TextField
              label="מספר רישיון נהיגה"
              value={newVolunteer.driverLicenseNumber}
              onChange={(e) => setNewVolunteer({ ...newVolunteer, driverLicenseNumber: e.target.value })}
              required
            />
          </FormSection>
          <Button type="submit" variant="contained" size="large" sx={{ mt: 3 }}>
            שמור מתנדב
          </Button>
        </form>
      </Card>

      <Typography
        sx={{
          mb: 2,
          fontSize: '0.7rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'primary.dark',
          fontWeight: 500,
        }}
      >
        רשימת מתנדבים קיימים
      </Typography>

      {volunteers.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">אין מתנדבים רשומים במסד הנתונים.</Typography>
        </Card>
      ) : (
        volunteers.map((v, idx) => (
          <Card key={idx} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>מתנדב #{v.id}</Typography>
              <Chip
                size="small"
                label={v.isAvailable ? 'זמין' : 'לא זמין'}
                color={v.isAvailable ? 'primary' : 'default'}
                variant={v.isAvailable ? 'filled' : 'outlined'}
              />
            </Box>
            <Typography color="text.secondary"><strong>ת.ז:</strong> {v.idNumber}</Typography>
            {v.driverLicenseNumber && (
              <Typography color="text.secondary"><strong>מספר רישיון:</strong> {v.driverLicenseNumber}</Typography>
            )}
            <Typography color="text.secondary">
              <strong>רכב:</strong> {v.vehicleType} · <strong>קיבולת:</strong> {v.maxCapacityKg} ק"ג
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}