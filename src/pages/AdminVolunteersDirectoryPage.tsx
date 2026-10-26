import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { AdminVolunteerListItemDto } from '../types/api';
import { getToken } from '../utils/auth';

export function AdminVolunteersDirectoryPage() {
  const [volunteers, setVolunteers] = useState<AdminVolunteerListItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = getToken();
    
    // תיקון הנתיב ל-/api/volunteers בהתאם לשרת ה-Backend
    fetch('/api/volunteers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(async res => {
        if (!res.ok) {
          throw new Error(`שגיאת שרת: ${res.status}`);
        }
        return res.json();
      })
      .then((data: AdminVolunteerListItemDto[]) => {
        if (Array.isArray(data)) {
          setVolunteers(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת מתנדבים:', err);
        setLoading(false);
      });
  }, []);

  const filteredVolunteers = volunteers.filter(v =>
    (v.name && v.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (v.phone && v.phone.includes(searchTerm)) ||
    (v.email && v.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <LoadingBlock text="טוען נתוני מתנדבים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <PageTitle eyebrow="ניהול מערכת" title="ספריית מתנדבים" subtitle="חיפוש ואיתור מהיר של מתנדבים במערכת." />

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="חיפוש לפי שם, טלפון או אימייל..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {filteredVolunteers.length === 0 ? (
        <EmptyState text="לא נמצאו מתנדבים התואמים את החיפוש." />
      ) : (
        filteredVolunteers.map((vol) => (
          <Card key={vol.id || vol.userId} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{vol.name || 'מתנדב ללא שם'}</Typography>
              <Typography color="text.secondary" variant="body2">טלפון: {vol.phone || 'לא צויין'} | אימייל: {vol.email || 'לא צויין'}</Typography>
            </Box>
            <Chip color="success" variant="outlined" label={vol.status || 'פעיל'} />
          </Card>
        ))
      )}
    </Box>
  );
}