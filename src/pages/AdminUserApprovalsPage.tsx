import React, { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { openSupplierLicense } from '../utils/openSupplierLicense';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { formatDateTime, isDateBeforeToday } from '../utils/format';
import type { PendingApprovalRequestDto, RequestedRoleName } from '../types/api';

// אישורי משתמשים - מנגנון האישור היחיד בשרת (api/approvalrequests):
// בכל אישור/דחייה נשלח מייל, נשמר מי טיפל ומתי, בקשת האישור מתעדכנת והמשתמש מקבל את התפקיד המתאים.
// תוקן: בעבר העמוד סינן רשימות לפי שדה שלא קיים במתנדבים, וכל סוג משתמש עבר במסלול אישור אחר.

const TABS: { value: RequestedRoleName; label: string }[] = [
  { value: 'Volunteer', label: 'מתנדבים ממתינים' },
  { value: 'Supplier', label: 'ספקים ממתינים' },
  { value: 'Ngo', label: 'עמותות ממתינות' },
];

export function AdminUserApprovalsPage() {
  const [role, setRole] = useState<RequestedRoleName>('Volunteer');
  const [pending, setPending] = useState<PendingApprovalRequestDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/approvalrequests/pending?role=${role}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(await readErrorMessage(res, 'שגיאה בטעינת הבקשות.'));
      setPending((await res.json()) as PendingApprovalRequestDto[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPending();
  }, [role]);

  const decide = async (request: PendingApprovalRequestDto, approve: boolean) => {
    let body: string | undefined;
    if (!approve) {
      const reason = window.prompt('סיבת הדחייה (תישלח למשתמש במייל):');
      if (reason === null) return;
      if (!reason.trim()) {
        alert('יש לציין סיבת דחייה.');
        return;
      }
      body = JSON.stringify({ reason: reason.trim() });
    }

    const res = await fetch(`/api/approvalrequests/${request.id}/${approve ? 'approve' : 'reject'}`, {
      method: 'POST',
      headers: authHeaders(!approve),
      body,
    });

    if (res.ok) {
      setNotice(approve ? 'הבקשה אושרה ונשלח מייל למשתמש.' : 'הבקשה נדחתה ונשלח מייל למשתמש.');
      void fetchPending();
    } else {
      alert(await readErrorMessage(res, 'הפעולה נכשלה.'));
    }
  };

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="אישורי משתמשים"
        subtitle="משתמשים שנרשמו וממתינים לאישור מנהל, כולל תוצאות הבדיקה האוטומטית."
      />

      <Tabs
        value={role}
        onChange={(_e: React.SyntheticEvent, value: RequestedRoleName) => { setRole(value); setNotice(null); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : pending.length === 0 ? (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">אין בקשות ממתינות בקטגוריה זו.</Typography>
        </Card>
      ) : (
        pending.map((item) => (
          <Card key={item.id} sx={{ p: { xs: 2.5, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 500 }}>
                {item.user?.name ?? `משתמש #${item.userId}`}
                {item.profileName && role !== 'Volunteer' && ` (${item.profileName})`}
              </Typography>
              <Chip
                size="small"
                color={item.passedAutomaticValidation ? 'success' : 'warning'}
                label={item.passedAutomaticValidation ? 'עבר בדיקה אוטומטית' : 'דורש בדיקה ידנית'}
              />
            </Box>

            <Typography color="text.secondary">אימייל: {item.user?.email ?? '—'} · טלפון: {item.user?.phone ?? '—'}</Typography>
            <Typography color="text.secondary">נרשם: {formatDateTime(item.createdAt)}</Typography>
            {item.vehicleType && (
              <Typography color="text.secondary">
                רכב: {item.vehicleType} · עד {item.maxCapacityKg ?? '—'} ק"ג · רישיון בתוקף עד {item.driverLicenseExpiry ? formatDateTime(item.driverLicenseExpiry).split(' ')[0] : '—'}
              </Typography>
            )}
            {role === 'Volunteer' && (!item.driverLicenseExpiry || isDateBeforeToday(item.driverLicenseExpiry)) && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                רישיון הנהיגה אינו בתוקף (או שלא הוזן תוקף), ולכן אי אפשר לאשר את המתנדב.
              </Alert>
            )}
            {item.address && <Typography color="text.secondary">כתובת: {item.address}</Typography>}
            {item.taxId && <Typography color="text.secondary">ח.פ / תיק עוסק: {item.taxId}</Typography>}
            {item.registrationNumber && <Typography color="text.secondary">מספר רישום: {item.registrationNumber}</Typography>}
            {item.validationDetails && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>בדיקה אוטומטית: {item.validationDetails}</Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => void decide(item, true)}>אשר</Button>
              <Button variant="outlined" color="error" onClick={() => void decide(item, false)}>דחה</Button>
              {role === 'Supplier' && item.profileId && item.hasLicenseFile && (
                <Button variant="text" onClick={() => void openSupplierLicense(item.profileId!)}>
                  צפייה ברישיון העסק
                </Button>
              )}
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
