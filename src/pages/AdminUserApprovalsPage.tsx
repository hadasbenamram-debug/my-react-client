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
import { errorMessage } from '../api/http';
import { useAppDispatch, useAppSelector } from '../store';
import { decideApprovalRequest, fetchPendingApprovals, selectPendingApprovals } from '../store/adminSlice';
import { formatDateTime, isDateBeforeToday } from '../utils/format';
import type { PendingApprovalRequestDto, RequestedRoleName } from '../types/api';

// תיקון 39: מתנדב בלי רישיון נהיגה בתוקף - השרת ממילא לא מאשר אותו, ולכן גם הכפתור "אשר" מושבת (במקום לחיצה
// שנגמרת בהודעת alert של הדפדפן)
const licenseInvalid = (role: RequestedRoleName, item: PendingApprovalRequestDto) =>
  role === 'Volunteer' && (!item.driverLicenseExpiry || isDateBeforeToday(item.driverLicenseExpiry));

// אישורי משתמשים - מנגנון האישור היחיד בשרת (api/approvalrequests):
// בכל אישור/דחייה נשלח מייל, נשמר מי טיפל ומתי, בקשת האישור מתעדכנת והמשתמש מקבל את התפקיד המתאים.
// תוקן: בעבר העמוד סינן רשימות לפי שדה שלא קיים במתנדבים, וכל סוג משתמש עבר במסלול אישור אחר.

const TABS: { value: RequestedRoleName; label: string }[] = [
  { value: 'Volunteer', label: 'מתנדבים ממתינים' },
  { value: 'Supplier', label: 'ספקים ממתינים' },
  { value: 'Ngo', label: 'עמותות ממתינות' },
];

export function AdminUserApprovalsPage() {
  const dispatch = useAppDispatch();
  const [role, setRole] = useState<RequestedRoleName>('Volunteer');
  const approvals = useAppSelector(selectPendingApprovals);
  const pending = approvals.items ?? [];
  // ספינר בכל טעינה של הרשימה (כמו קודם), וגם כשבסלייס עוד יש רשימה של לשונית אחרת
  const loading = approvals.role !== role || approvals.status === 'loading' || approvals.status === 'idle';
  const error = approvals.status === 'failed' ? approvals.error : null;
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => {
    void dispatch(fetchPendingApprovals(role));
  }, [dispatch, role]);

  const decide = async (request: PendingApprovalRequestDto, approve: boolean) => {
    let reason: string | undefined;
    if (!approve) {
      const input = window.prompt('סיבת הדחייה (תישלח למשתמש במייל):');
      if (input === null) return;
      if (!input.trim()) {
        alert('יש לציין סיבת דחייה.');
        return;
      }
      reason = input.trim();
    }

    try {
      await dispatch(decideApprovalRequest({ requestId: request.id, approve, reason })).unwrap();
      setActionError(null);
      setNotice(approve ? 'הבקשה אושרה ונשלח מייל למשתמש.' : 'הבקשה נדחתה ונשלח מייל למשתמש.');
      void dispatch(fetchPendingApprovals(role));
    } catch (err) {
      // השגיאה מהשרת (למשל רישיון שפג בדיוק עכשיו) מוצגת בעמוד, ליד הבקשה
      setNotice(null);
      setActionError({ id: request.id, text: errorMessage(err, 'הפעולה נכשלה.') });
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
        onChange={(_e: React.SyntheticEvent, value: RequestedRoleName) => { setRole(value); setNotice(null); setActionError(null); }}
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
            {licenseInvalid(role, item) && (
              <Alert severity="warning" sx={{ mt: 1.5 }}>
                רישיון הנהיגה אינו בתוקף (או שלא הוזן תוקף), ולכן אי אפשר לאשר את המתנדב.
                אפשר לדחות את הבקשה ולבקש ממנו להירשם עם רישיון בתוקף.
              </Alert>
            )}
            {item.address && <Typography color="text.secondary">כתובת: {item.address}</Typography>}
            {item.taxId && <Typography color="text.secondary">ח.פ / תיק עוסק: {item.taxId}</Typography>}
            {item.registrationNumber && <Typography color="text.secondary">מספר רישום: {item.registrationNumber}</Typography>}
            {item.validationDetails && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>בדיקה אוטומטית: {item.validationDetails}</Typography>
            )}

            <Box sx={{ display: 'flex', gap: 1.5, mt: 2.5, flexWrap: 'wrap' }}>
              <Button variant="contained" disabled={licenseInvalid(role, item)} onClick={() => void decide(item, true)}>אשר</Button>
              <Button variant="outlined" color="error" onClick={() => void decide(item, false)}>דחה</Button>
              {role === 'Supplier' && item.profileId && item.hasLicenseFile && (
                <Button variant="text" onClick={() => void openSupplierLicense(dispatch, item.profileId!)}>
                  צפייה ברישיון העסק
                </Button>
              )}
            </Box>
            {actionError?.id === item.id && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setActionError(null)}>{actionError.text}</Alert>
            )}
          </Card>
        ))
      )}
    </Box>
  );
}
