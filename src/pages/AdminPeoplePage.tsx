import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import PageTitle from '../components/PageTitle';
import { AdminUsersManagementPage } from './AdminUsersManagementPage';
import { AdminVolunteersDirectoryPage } from './AdminVolunteersDirectoryPage';
import { AdminSuppliersDirectoryPage } from './AdminSuppliersDirectoryPage';
import { AdminNgosDirectoryPage } from './AdminNgosDirectoryPage';

// תיקון 63: ארבע הרשימות של המנהל (ניהול משתמשים, ספריית מתנדבים, ספקים ועמותות) - עמוד אחד עם לשוניות.
// הלשונית נשמרת בכתובת (?tab=volunteers), כך שהכתובות הישנות של הספריות מפנות ישר ללשונית הנכונה.

export type PeopleTab = 'all' | 'volunteers' | 'suppliers' | 'ngos';

const TABS: { value: PeopleTab; label: string; subtitle: string }[] = [
  { value: 'all', label: 'כל המשתמשים', subtitle: 'חיפוש לפי שם או אימייל, התפקידים של כל חשבון, ואימות המייל והטלפון.' },
  { value: 'volunteers', label: 'מתנדבים', subtitle: 'סטטוס האישור, זמינות, רכב וקיבולת, תוקף הרישיון וציון האמינות.' },
  { value: 'suppliers', label: 'ספקים ותורמים', subtitle: 'בתי העסק וגופי התרומה, כולל צפייה ברישיון העסק.' },
  { value: 'ngos', label: 'עמותות', subtitle: 'העמותות והארגונים שמקבלים תרומות.' },
];

export function AdminPeoplePage() {
  const [params, setParams] = useSearchParams();
  const current = TABS.find((t) => t.value === params.get('tab')) ?? TABS[0];

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <PageTitle eyebrow="ניהול מערכת" title="משתמשים" subtitle={current.subtitle} />

      <Tabs
        value={current.value}
        onChange={(_e: React.SyntheticEvent, value: PeopleTab) => setParams(value === 'all' ? {} : { tab: value }, { replace: true })}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        {TABS.map((t) => <Tab key={t.value} value={t.value} label={t.label} />)}
      </Tabs>

      {current.value === 'all' && <AdminUsersManagementPage embedded />}
      {current.value === 'volunteers' && <AdminVolunteersDirectoryPage embedded />}
      {current.value === 'suppliers' && <AdminSuppliersDirectoryPage embedded />}
      {current.value === 'ngos' && <AdminNgosDirectoryPage embedded />}
    </Box>
  );
}
