import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { AdminNgoListItemView } from '../types/api';

export function AdminNgosDirectoryPage() {
  const [ngos, setNgos] = useState<AdminNgoListItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/ngos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then((data: AdminNgoListItemView[]) => {
        if (Array.isArray(data)) {
          setNgos(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת עמותות:', err);
        setLoading(false);
      });
  }, []);

  const filteredNgos = ngos.filter(n =>
    (n.name && n.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (n.phone && n.phone.includes(searchTerm)) ||
    (n.city && n.city.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <LoadingBlock text="טוען נתוני עמותות..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <PageTitle eyebrow="ניהול מערכת" title="ספריית עמותות" subtitle="חיפוש וניהול של כלל העמותות והארגונים במערכת." />

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="חיפוש לפי שם עמותה, טלפון או עיר..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {filteredNgos.length === 0 ? (
        <EmptyState text="לא נמצאו עמותות התואמות את החיפוש." />
      ) : (
        filteredNgos.map((ngo) => (
          <Card key={ngo.id} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{ngo.name || 'עמותה ללא שם'}</Typography>
              <Typography color="text.secondary" variant="body2">טלפון: {ngo.phone || 'לא צויין'} | עיר: {ngo.city || 'לא צויין'}</Typography>
            </Box>
            <Chip color="success" label={ngo.status || 'פעיל'} />
          </Card>
        ))
      )}
    </Box>
  );
}