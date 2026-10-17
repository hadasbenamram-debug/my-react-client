import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import PageTitle from '../components/PageTitle';
import { openSupplierLicense } from '../utils/openSupplierLicense';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import type { AdminSupplierListItemView } from '../types/api';

export function AdminSuppliersDirectoryPage() {
  const [suppliers, setSuppliers] = useState<AdminSupplierListItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/suppliers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then((data: AdminSupplierListItemView[]) => {
        if (Array.isArray(data)) {
          setSuppliers(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת ספקים:', err);
        setLoading(false);
      });
  }, []);

  const filteredSuppliers = suppliers.filter(s =>
    (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.address && s.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <LoadingBlock text="טוען נתוני ספקים ותורמים..." />;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 2 }}>
      <PageTitle eyebrow="ניהול מערכת" title="ספריית ספקים ותורמים" subtitle="חיפוש ואיתור מהיר של בתי עסק וגופי תרומה." />

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="חיפוש לפי שם עסק, טלפון או כתובת..."
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>

      {filteredSuppliers.length === 0 ? (
        <EmptyState text="לא נמצאו ספקים התואמים את החיפוש." />
      ) : (
        filteredSuppliers.map((sup) => (
          <Card key={sup.id} sx={{ p: 2.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>{sup.name || 'עסק ללא שם'}</Typography>
              <Typography color="text.secondary" variant="body2">טלפון: {sup.phone || 'לא צויין'} | כתובת: {sup.address || 'לא צויין'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button size="small" variant="text" onClick={() => openSupplierLicense(sup.id)}>
                רישיון עסק
              </Button>
              <Chip color="primary" variant="outlined" label={sup.status || 'פעיל'} />
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}