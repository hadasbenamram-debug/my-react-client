import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import type { AccountRoleDto, MyProfileDto } from '../types/api';
import { roleTitle } from '../utils/auth';
import type { AddableRole } from '../hooks/useAddRoleMode';

const statusText = (status: AccountRoleDto['status']) =>
  status === 'Approved' ? 'והתפקיד מאושר' : status === 'Pending' ? 'והבקשה ממתינה לאישור מנהל' : 'אבל הבקשה נדחתה';

interface AddRoleNoticeProps {
  role: AddableRole;
  account: MyProfileDto | null;
  existing?: AccountRoleDto;
}

/** הודעה בראש טופס ההרשמה כשמחוברים: לאיזה חשבון יצורף התפקיד, או שהוא כבר קיים */
export function AddRoleNotice({ role, account, existing }: AddRoleNoticeProps) {
  const myRoles = (
    <Link component={RouterLink} to="/app/profile#roles">לכרטיס "התפקידים שלי"</Link>
  );

  if (existing) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        החשבון שלך כבר רשום {roleTitle(role)} {statusText(existing.status)}. {myRoles}
      </Alert>
    );
  }

  if (account && !account.canAddRoles) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        לחשבון מנהל לא מוסיפים תפקידים. כדי להתנדב או לתרום - מתנתקים ונרשמים עם כתובת מייל אחרת.
      </Alert>
    );
  }

  return (
    <Alert severity="info" sx={{ mb: 3 }}>
      את/ה מחובר/ת{account?.email ? ` (${account.email})` : ''}, ולכן התפקיד יתווסף לחשבון הזה: ממלאים רק את פרטי
      התפקיד החדש, בלי סיסמה נוספת. הבקשה עוברת לאישור מנהל, ועד אז ממשיכים לעבוד כרגיל בתפקידים הקיימים.
      {' '}כדי לרשום חשבון אחר - קודם מתנתקים מהמערכת.
    </Alert>
  );
}

interface KnownIdNumberBoxProps {
  /** תעודת הזהות מהחשבון, מוסתרת ("•••••6789") - כמו שהשרת מחזיר ב-MyProfileDto.knownIdNumberMasked */
  masked: string;
  children: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * תיקון 32: תעודת זהות שכבר שמורה בחשבון - מוצגת (מוסתרת) במקום שדה להזנה חוזרת.
 * השרת ממלא את המספר המלא בעצמו; הלקוח אף פעם לא מקבל אותו.
 */
export function KnownIdNumberBox({ masked, children, actionLabel, onAction }: KnownIdNumberBoxProps) {
  return (
    <Alert
      severity="success"
      icon={<BadgeOutlinedIcon fontSize="inherit" />}
      sx={{ gridColumn: '1 / -1', alignItems: 'center' }}
      action={actionLabel && onAction ? (
        <Button color="inherit" size="small" onClick={onAction}>{actionLabel}</Button>
      ) : undefined}
    >
      {children}{' '}
      <Box component="span" dir="ltr" sx={{ fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{masked}</Box>
    </Alert>
  );
}
