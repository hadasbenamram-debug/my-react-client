import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PageTitle from './PageTitle';
import { EmptyState, LoadingBlock } from './PageParts';
import { CommentItem } from './CommentParts';
import { authHeaders } from '../utils/auth';
import { readErrorMessage } from '../utils/apiError';
import type { CommentDto, DonationResponseDto, MatchResponseDto, SupplierDonationSummaryDto } from '../types/api';

export type CommentsRole = 'volunteer' | 'supplier' | 'ngo';

interface TargetOption {
  key: string;
  label: string;
  donationId?: number;
  matchId?: number;
}

// לוח תגובות משותף למתנדב / ספק / עמותה (עץ רקורסיבי).
// תוקן: תגובה חדשה נשלחה בלי יעד (תרומה / שידוך), והשרת דחה אותה. עכשיו בוחרים על מה התגובה,
// ותשובה לתגובה יורשת את היעד שלה. שם הכותב נקבע בשרת לפי המשתמש המחובר.
export default function CommentsBoard({ role, eyebrow }: { role: CommentsRole; eyebrow: string }) {
  const [tree, setTree] = useState<CommentDto[]>([]);
  const [targets, setTargets] = useState<TargetOption[]>([]);
  const [targetKey, setTargetKey] = useState('');
  const [newText, setNewText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTree = async () => {
    const res = await fetch('/api/comments/tree', { headers: authHeaders() });
    setTree(res.ok ? ((await res.json()) as CommentDto[]) : []);
  };

  const fetchTargets = async () => {
    let options: TargetOption[] = [];
    if (role === 'volunteer') {
      const res = await fetch('/api/matches/active', { headers: authHeaders() });
      const matches = res.ok ? ((await res.json()) as MatchResponseDto[]) : [];
      options = matches.map((m) => ({ key: `m${m.id}`, matchId: m.id, label: `איסוף מ${m.supplierName ?? 'ספק'} (תרומה #${m.donationId})` }));
    } else if (role === 'supplier') {
      const res = await fetch('/api/donations/my-supplier-donations', { headers: authHeaders() });
      const donations = res.ok ? ((await res.json()) as SupplierDonationSummaryDto[]) : [];
      options = donations.map((d) => ({ key: `d${d.id}`, donationId: d.id, label: `תרומה #${d.id}` }));
    } else {
      const res = await fetch('/api/donations/my-ngo-donations', { headers: authHeaders() });
      const donations = res.ok ? ((await res.json()) as DonationResponseDto[]) : [];
      options = donations.map((d) => ({ key: `d${d.id}`, donationId: d.id, label: `תרומה #${d.id} מ${d.supplierName ?? 'ספק'}` }));
    }
    setTargets(options);
    if (options.length > 0) setTargetKey(options[0].key);
  };

  useEffect(() => {
    Promise.all([fetchTree(), fetchTargets()]).finally(() => setLoading(false));
  }, [role]);

  const post = async (body: object) => {
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
    const target = targets.find((t) => t.key === targetKey);
    if (!newText.trim() || !target) return;
    if (await post({ content: newText.trim(), donationId: target.donationId ?? null, matchId: target.matchId ?? null })) {
      setNewText('');
    }
  };

  const handleReply = (parentId: number, text: string) => {
    void post({ content: text.trim(), parentCommentId: parentId });
  };

  const targetLabel = (c: CommentDto) =>
    c.donationId ? `תרומה #${c.donationId}` : c.matchId ? `שידוך #${c.matchId}` : '';

  if (loading) return <LoadingBlock text="טוען תגובות..." />;

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle eyebrow={eyebrow} title="תגובות" subtitle="שיחה על תרומות ושיבוצים שאתם חלק מהם. אפשר להגיב לכל תגובה." />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 3 }}>
        {tree.length > 0 ? (
          tree.map((comment) => (
            <Box key={comment.id} sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">{targetLabel(comment)}</Typography>
              <CommentItem comment={comment} onReply={handleReply} inline />
            </Box>
          ))
        ) : (
          <EmptyState text="אין תגובות להצגה." />
        )}
      </Box>

      <Card sx={{ p: { xs: 2.5, md: 3 } }}>
        {targets.length === 0 ? (
          <Typography color="text.secondary">אפשר להוסיף תגובה כשיש תרומה או שיבוץ פעיל שאתם חלק מהם.</Typography>
        ) : (
          <Box component="form" onSubmit={handleAdd} sx={{ display: 'grid', gap: 1.5 }}>
            <TextField select size="small" label="על מה התגובה?" value={targetKey} onChange={(e) => setTargetKey(e.target.value)}>
              {targets.map((t) => <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <TextField value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="תגובה חדשה..."
                slotProps={{ htmlInput: { maxLength: 1000 } }} />
              <Button type="submit" variant="contained" sx={{ px: 4, py: 1.75, flexShrink: 0 }}>שלח</Button>
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  );
}
