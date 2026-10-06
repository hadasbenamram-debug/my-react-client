import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection } from '../components/FormParts.jsx';

interface VolunteerDto {
  id?: number;
  vehicleType: string;
  maxCapacityKg: number;
  isAvailable: boolean;
  currentLatitude: number;
  currentLongitude: number;
  idNumber: string;
  dateOfBirth: string;
  reliabilityScore: number;
}

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<VolunteerDto[]>([]);
  const [loading, setLoading] = useState(true);

  // טופס להוספת מתנדב חדש
  const [newVolunteer, setNewVolunteer] = useState<VolunteerDto>({
    vehicleType: 'רכב פרטי',
    maxCapacityKg: 50,
    isAvailable: true,
    currentLatitude: 32.0853,
    currentLongitude: 34.7818,
    idNumber: '',
    dateOfBirth: '1995-01-01T00:00:00',
    reliabilityScore: 100
  });

  // שליפת כל המתנדבים מהשרת בעת טעינת המסך
  const fetchVolunteers = () => {
    fetch('/api/volunteers')
      .then(res => res.json())
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

  // שליחת מתנדב חדש לשרת (POST)
  const handleCreateVolunteer = (e: React.FormEvent) => {
    e.preventDefault();

    fetch('/api/volunteers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newVolunteer)
    })
      .then(res => {
        if (res.ok) {
          alert('המתנדב נוסף בהצלחה למסד הנתונים!');
          fetchVolunteers(); // רענון הרשימה מהשרת
        } else {
          alert('שגיאה בשמירת המתנדב.');
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
            <Typography color="text.secondary">
              <strong>רכב:</strong> {v.vehicleType} · <strong>קיבולת:</strong> {v.maxCapacityKg} ק"ג
            </Typography>
          </Card>
        ))
      )}
    </Box>
  );
}
