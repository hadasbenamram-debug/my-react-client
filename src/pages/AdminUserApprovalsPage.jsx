import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';

export function AdminUserApprovalsPage() {
  const [selectedRole, setSelectedRole] = useState('volunteers'); // 'volunteers', 'suppliers', או 'associations'
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // הגדרת הנתיב בהתאם לסוג הנבחר
  const getApiEndpoint = (role) => {
    switch (role) {
      case 'volunteers': return '/api/volunteers';
      case 'suppliers': return '/api/suppliers';
      case 'associations': return '/api/ngos'; // נתיב נכון עבור עמותות
      default: return '/api/volunteers';
    }
  };

  const apiEndpoint = getApiEndpoint(selectedRole);

  const fetchPendingUsers = () => {
    setLoading(true);
    setError(null);
    fetch(apiEndpoint, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'שגיאה בטעינת נתונים ממתינים');
        }
        return res.json();
      })
      .then(data => {
        // סינון רחב שמתאים גם למספרים וגם למחרוזות (Pending / pending / 0)
        const pending = data.filter(u => {
          const status = u.approvalStatus !== undefined ? u.approvalStatus : u.ApprovalStatus;
          return status === 'Pending' || status === 'pending' || status === 0;
        });

        setPendingUsers(pending);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPendingUsers();
  }, [selectedRole]);

  const handleApprove = (id) => {
    fetch(`${apiEndpoint}/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(async res => {
        if (res.ok) {
          alert('הבקשה אושרה בהצלחה ונשלח מייל למשתמש!');
          fetchPendingUsers();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || 'שגיאה באישור הבקשה.');
        }
      })
      .catch(err => console.error(err));
  };

  const handleReject = (id) => {
    const reason = prompt('הכנס סיבת דחייה:');
    if (reason === null) return; // בוטל

    fetch(`${apiEndpoint}/${id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(reason)
    })
      .then(async res => {
        if (res.ok) {
          alert('הבקשה נדחתה בהצלחה.');
          fetchPendingUsers();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.message || 'שגיאה בדחיית הבקשה.');
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="אישורי משתמשים"
        subtitle="כאן ניתן לצפות בכל המשתמשים שנרשמו וממתינים לאישור מנהל."
      />

      <Tabs
        value={selectedRole}
        onChange={(e, value) => setSelectedRole(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="volunteers" label="מתנדבים ממתינים" />
        <Tab value="suppliers" label="ספקים ממתינים" />
        <Tab value="associations" label="עמותות ממתינות" />
      </Tabs>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : pendingUsers.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">אין בקשות ממתינות להצגה בקטגוריה זו.</Typography>
        </Card>
      ) : (
        pendingUsers.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {item.name || item.fullName}
                {(item.businessName || item.BusinessName) && ` (עסק: ${item.businessName || item.BusinessName})`}
                {item.associationName && ` (עמותה: ${item.associationName})`}
              </Typography>
              <Typography color="primary.dark">מזהה: #{item.id}</Typography>
            </Box>

            <Typography color="text.secondary">אימייל: {item.email}</Typography>
            <Typography color="text.secondary">טלפון: {item.phone}</Typography>
            {item.vehicleType && <Typography color="text.secondary">רכב: {item.vehicleType}</Typography>}
            {(item.address || item.Address) && (
              <Typography color="text.secondary">כתובת: {item.address || item.Address}</Typography>
            )}
            {(item.taxId || item.TaxId) && (
              <Typography color="text.secondary">ח.פ / תיק עוסק: {item.taxId || item.TaxId}</Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5 }}>
              <Button variant="contained" onClick={() => handleApprove(item.id)}>
                אשר
              </Button>
              <Button variant="outlined" color="error" onClick={() => handleReject(item.id)}>
                דחה
              </Button>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
