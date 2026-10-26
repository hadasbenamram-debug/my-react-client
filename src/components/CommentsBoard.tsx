import { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import PageTitle from './PageTitle';
import { EmptyState, LoadingBlock } from './PageParts';
import { CommentItem } from './CommentParts';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import { formatDateTime } from '../utils/format';
import type { CommentDto, DonationResponseDto, MatchResponseDto, MatchStatusName, SupplierDonationSummaryDto } from '../types/api';

export type CommentsRole = 'volunteer' | 'supplier' | 'ngo';

/** תרומה שאפשר לכתוב עליה תגובה חדשה */
interface DonationOption {
  donationId: number;
  /** מה שמופיע אחרי "תרומה #21": הספק והעמותה / מתי פורסמה */
  detail: string;
}

// שיחה אחת = כל התגובות על אותה תרומה
interface Conversation {
  donationId: number;
  detail: string;
  roots: CommentDto[];
  count: number;
  lastActivity: number;
}

// תיקון 18: הדף של כל תפקיד מציג רק את התרומות של התפקיד הזה (למשתמש עם כמה תפקידים)
const ROLE_PARAM: Record<CommentsRole, string> = { volunteer: 'Volunteer', supplier: 'Supplier', ngo: 'Ngo' };

const NO_OPTIONS_TEXT: Record<CommentsRole, string> = {
  volunteer: 'אפשר לכתוב תגובה על תרומה שאתם אוספים או שכבר מסרתם. כרגע אין כזו.',
  supplier: 'אפשר לכתוב תגובה על תרומה שפרסמתם. כרגע אין כזו.',
  ngo: 'אפשר לכתוב תגובה על תרומה שמגיעה אליכם. כרגע אין כזו.',
};

// מתנדב מגיב על תרומות שלקח על עצמו - לא על הצעות שדחה או שלא ענה עליהן
const VOLUNTEER_TAKEN: MatchStatusName[] = ['Confirmed', 'InPickup', 'InTransit', 'Completed'];

const donationTitle = (donationId: number) => `תרומה #${donationId}`;
const countAll = (c: CommentDto): number => 1 + (c.replies ?? []).reduce((n, r) => n + countAll(r), 0);
const lastActivityOf = (c: CommentDto): number =>
  Math.max(Date.parse(c.createdAt) || 0, ...(c.replies ?? []).map(lastActivityOf));

async function getList<T>(url: string): Promise<T[]> {
  const res = await fetch(url, { headers: authHeaders() });
  return res.ok ? ((await res.json()) as T[]) : [];
}

async function loadDonationOptions(role: CommentsRole): Promise<DonationOption[]> {
  if (role === 'volunteer') {
    const matches = await getList<MatchResponseDto>('/api/matches/my-history');
    const options: DonationOption[] = [];
    for (const m of matches) {
      if (!VOLUNTEER_TAKEN.includes(m.statusName) || options.some((o) => o.donationId === m.donationId)) continue;
      options.push({ donationId: m.donationId, detail: `${m.supplierName ?? 'ספק'} ← ${m.ngoName ?? 'עמותה'}` });
    }
    return options;
  }
  if (role === 'supplier') {
    const donations = await getList<SupplierDonationSummaryDto>('/api/donations/my-supplier-donations');
    return donations.map((d) => ({ donationId: d.id, detail: `פורסמה ${formatDateTime(d.createdAt)}` }));
  }
  const donations = await getList<DonationResponseDto>('/api/donations/my-ngo-donations');
  return donations.map((d) => ({ donationId: d.id, detail: d.supplierName ?? 'ספק' }));
}

/** "תגובה חדשה על התרומה" בתחתית כל שיחה */
function ConversationComposer({ donationId, onSend }: { donationId: number; onSend: (text: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  if (!open) {
    return (
      <Button
        size="small"
        variant="text"
        startIcon={<AddCommentOutlinedIcon />}
        sx={{ mt: 2.5, px: 0.5, color: 'primary.dark', fontWeight: 500, letterSpacing: 0 }}
        onClick={() => setOpen(true)}
      >
        תגובה חדשה על התרומה
      </Button>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    if (await onSend(text.trim())) {
      setText('');
      setOpen(false);
    }
    setSending(false);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2.5, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
      <TextField
        size="small"
        multiline
        minRows={2}
        maxRows={6}
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`תגובה על ${donationTitle(donationId)}...`}
        slotProps={{ htmlInput: { maxLength: 1000, 'aria-label': `תגובה חדשה על ${donationTitle(donationId)}` } }}
      />
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button type="submit" variant="contained" size="small" disabled={sending || !text.trim()} sx={{ px: 2.5, py: 0.6 }}>
          {sending ? 'שולח...' : 'שליחה'}
        </Button>
        <Button variant="text" size="small" sx={{ px: 1.5, py: 0.6 }} onClick={() => { setOpen(false); setText(''); }}>
          ביטול
        </Button>
      </Stack>
    </Box>
  );
}

// לוח תגובות משותף למתנדב / ספק / עמותה (עץ רקורסיבי).
// תוקן: תגובה חדשה נשלחה בלי יעד, והשרת דחה אותה. עכשיו בוחרים על מה התגובה,
// ותשובה לתגובה יורשת את היעד שלה. שם הכותב נקבע בשרת לפי המשתמש המחובר.
// תיקון 15: עיצוב חדש - כל השיחה על אותה תרומה בכרטיס אחד (השיחה האחרונה למעלה), תגובה חדשה בראש הדף.
// תיקון 18: כל תגובה היא על תרומה מסוימת. מתנדב כבר לא מגיב על "שיבוץ" אלא על התרומה שהוא אוסף,
// ולכן לכל תרומה יש שיחה אחת בלבד. בכל שיחה אפשר להוסיף תגובה על אותה תרומה.
export default function CommentsBoard({ role, eyebrow }: { role: CommentsRole; eyebrow: string }) {
  const [tree, setTree] = useState<CommentDto[]>([]);
  const [options, setOptions] = useState<DonationOption[]>([]);
  const [donationId, setDonationId] = useState<number | ''>('');
  const [newText, setNewText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTree = useCallback(async () => {
    const res = await fetch(`/api/comments/tree?role=${ROLE_PARAM[role]}`, { headers: authHeaders() });
    if (!res.ok) {
      setError(await readErrorMessage(res, 'לא הצלחנו לטעון את התגובות. נא לרענן את הדף.'));
      return;
    }
    setTree((await res.json()) as CommentDto[]);
  }, [role]);

  useEffect(() => {
    const loadOptions = loadDonationOptions(role).then((list) => {
      setOptions(list);
      setDonationId(list.length > 0 ? list[0].donationId : '');
    });
    Promise.all([fetchTree(), loadOptions])
      .catch(() => setError('לא הצלחנו לטעון את התגובות. נא לבדוק את החיבור ולרענן את הדף.'))
      .finally(() => setLoading(false));
  }, [role, fetchTree]);

  const conversations = useMemo<Conversation[]>(() => {
    const groups = new Map<number, Conversation>();
    for (const root of tree) {
      const group = groups.get(root.donationId) ?? {
        donationId: root.donationId,
        detail: options.find((o) => o.donationId === root.donationId)?.detail
          ?? (role === 'supplier' ? '' : root.donationSupplierName ?? ''),
        roots: [],
        count: 0,
        lastActivity: 0,
      };
      group.roots.push(root);
      group.count += countAll(root);
      group.lastActivity = Math.max(group.lastActivity, lastActivityOf(root));
      groups.set(root.donationId, group);
    }
    for (const group of groups.values()) {
      group.roots.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    }
    return [...groups.values()].sort((a, b) => b.lastActivity - a.lastActivity);
  }, [tree, options, role]);

  const post = async (body: { content: string; donationId?: number; parentCommentId?: number }) => {
    setError('');
    const res = await fetch('/api/comments', { method: 'POST', headers: authHeaders(true), body: JSON.stringify(body) });
    if (!res.ok) {
      setError(await readErrorMessage(res, 'שגיאה בשמירת התגובה.'));
      return false;
    }
    await fetchTree();
    return true;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim() || donationId === '') return;
    setSending(true);
    if (await post({ content: newText.trim(), donationId })) {
      setNewText('');
    }
    setSending(false);
  };

  const handleReply = (parentId: number, text: string) => {
    void post({ content: text.trim(), parentCommentId: parentId });
  };

  if (loading) return <LoadingBlock text="טוען תגובות..." />;

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto' }}>
      <PageTitle eyebrow={eyebrow} title="תגובות" subtitle="כל תגובה היא על תרומה מסוימת. השיחה על כל תרומה מרוכזת בכרטיס אחד, ואפשר להגיב לכל תגובה." />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card component="section" sx={{ p: { xs: 2.5, md: 3 }, mb: 3 }}>
        <Typography component="h2" sx={{ fontWeight: 600, fontSize: '1.05rem', mb: 2 }}>תגובה חדשה</Typography>
        {options.length === 0 ? (
          <Typography color="text.secondary">{NO_OPTIONS_TEXT[role]}</Typography>
        ) : (
          <Box component="form" onSubmit={handleAdd} sx={{ display: 'grid', gap: 1.5 }}>
            <TextField
              select
              size="small"
              label="על איזו תרומה?"
              value={donationId}
              onChange={(e) => setDonationId(Number(e.target.value))}
            >
              {options.map((o) => (
                <MenuItem key={o.donationId} value={o.donationId}>{`${donationTitle(o.donationId)} – ${o.detail}`}</MenuItem>
              ))}
            </TextField>
            <TextField
              multiline
              minRows={2}
              maxRows={6}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="למשל: איפה התרומה מחכה, או מתי מגיעים לאסוף"
              slotProps={{ htmlInput: { maxLength: 1000, 'aria-label': 'תגובה חדשה' } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="contained" disabled={sending || !newText.trim()}>
                {sending ? 'שולח...' : 'שליחת התגובה'}
              </Button>
            </Box>
          </Box>
        )}
      </Card>

      {conversations.length === 0 ? (
        <EmptyState text="עוד אין תגובות. התגובה הראשונה שתכתבו תופיע כאן, בכרטיס של התרומה." />
      ) : (
        conversations.map((conversation) => (
          <Card
            key={conversation.donationId}
            component="section"
            aria-labelledby={`donation-${conversation.donationId}`}
            sx={{ p: { xs: 2, md: 3 }, mb: 2.5 }}
          >
            <Box sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, flexWrap: 'wrap',
              mb: 2.5, pb: 1.5, borderBottom: '1px solid', borderColor: 'divider',
            }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography component="h2" id={`donation-${conversation.donationId}`} sx={{ fontWeight: 600, fontSize: '1.05rem' }}>
                  {donationTitle(conversation.donationId)}
                </Typography>
                {conversation.detail && (
                  <Typography variant="body2" color="text.secondary">{conversation.detail}</Typography>
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {conversation.count === 1 ? 'תגובה אחת' : `${conversation.count} תגובות`}
              </Typography>
            </Box>
            <Stack spacing={3}>
              {conversation.roots.map((comment) => (
                <CommentItem key={comment.id} comment={comment} onReply={handleReply} inline />
              ))}
            </Stack>
            <ConversationComposer
              donationId={conversation.donationId}
              onSend={(text) => post({ content: text, donationId: conversation.donationId })}
            />
          </Card>
        ))
      )}
    </Box>
  );
}
