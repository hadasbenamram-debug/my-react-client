import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import PageTitle from '../components/PageTitle';

export function AdminUsersManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = () => {
    const token = localStorage.getItem('token');

    fetch('/api/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('שגיאה בטעינת משתמשים');
        return res.json();
      })
      .then(data => {
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

  const handleToggleSuspend = (userId: number, currentStatus: boolean) => {
    const token = localStorage.getItem('token');
    const action = currentStatus ? 'activate' : 'suspend';

    fetch(`/api/users/${userId}/${action}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(res => {
        if (res.ok) {
          alert('סטטוס המשתמש עודכן בהצלחה!');
          fetchUsers();
        } else {
          alert('שגיאה בעדכון סטטוס המשתמש.');
        }
      })
      .catch(err => console.error('שגיאת תקשורת:', err));
  };

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
        subtitle="חיפוש, צפייה והשעיית משתמשים רשומים."
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
                <Chip
                  size="small"
                  label={user.isSuspended ? 'מושהה' : 'פעיל'}
                  color={user.isSuspended ? 'error' : 'primary'}
                  variant={user.isSuspended ? 'filled' : 'outlined'}
                />
              </Box>
              <Typography color="text.secondary"><strong>תפקיד:</strong> {user.role}</Typography>
              <Typography color="text.secondary"><strong>אימייל:</strong> {user.email}</Typography>
            </Box>
            <Button
              variant={user.isSuspended ? 'contained' : 'outlined'}
              color={user.isSuspended ? 'primary' : 'error'}
              onClick={() => handleToggleSuspend(user.id, user.isSuspended)}
            >
              {user.isSuspended ? 'הפעל מחדש' : 'השעה משתמש'}
            </Button>
          </Card>
        ))
      )}
    </Box>
  );
}
