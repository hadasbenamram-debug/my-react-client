import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import PageTitle from '../components/PageTitle';
import type { UserListItemView } from '../types/api';
import { getToken, roleTitle } from '../utils/auth';

export function AdminUsersManagementPage() {
  const [users, setUsers] = useState<UserListItemView[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState<number | null>(null);

  const fetchUsers = () => {
    const token = getToken();

    // הרשימה מעומדת בשרת; סך המשתמשים מגיע בכותרת X-Total-Count
    fetch('/api/users?page=1&pageSize=500', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת משתמשים');
        const totalHeader = res.headers.get('X-Total-Count');
        setTotal(totalHeader ? Number(totalHeader) : null);
        return res.json();
      })
      .then((data: UserListItemView[]) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת משתמשים:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <CircularProgress size={32} />
        <Typography color="text.secondary" sx={{ mt: 2 }}>טוען רשימת משתמשים...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="ניהול משתמשים"
        subtitle={total != null ? `${total} משתמשים רשומים.` : 'חיפוש וצפייה במשתמשים רשומים.'}
      />

      <TextField
        placeholder="חפש לפי שם או אימייל..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        sx={{ mb: 3 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {filteredUsers.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">לא נמצאו משתמשים התואמים את החיפוש.</Typography>
        </Card>
      ) : (
        filteredUsers.map((user) => (
          <Card
            key={user.id}
            sx={{
              p: { xs: 2.5, md: 3 },
              mb: 2,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 500 }}>{user.name}</Typography>
                <Chip size="small" variant="outlined" color={user.isEmailVerified ? 'success' : 'default'}
                  label={user.isEmailVerified ? 'מייל מאומת' : 'מייל לא מאומת'} />
                <Chip size="small" variant="outlined" color={user.isPhoneVerified ? 'success' : 'default'}
                  label={user.isPhoneVerified ? 'טלפון מאומת' : 'טלפון לא מאומת'} />
              </Box>
              {/* תיקון 10: לחשבון יכולים להיות כמה תפקידים (למשל ספק שהוא גם מתנדב) */}
              <Typography color="text.secondary">
                <strong>{(user.roles?.length ?? 0) > 1 ? 'תפקידים:' : 'תפקיד:'}</strong>{' '}
                {(user.roles?.length ? user.roles : [user.role]).map(roleTitle).join(' + ')}
              </Typography>
              <Typography color="text.secondary"><strong>אימייל:</strong> {user.email}</Typography>
              <Typography color="text.secondary"><strong>טלפון:</strong> {user.phone || '—'}</Typography>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
