import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
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
