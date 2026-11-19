import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import { clearSession } from '../utils/auth';
import { toErrorPayload } from '../api/http';
import { useAppDispatch } from '../store';
import { deleteAccount } from '../store/accountSlice';

// תיקון 77: מחיקת החשבון מהפרופיל.
// בשרת זו "מחיקה רכה" (IsActive = false): אי אפשר להתחבר יותר, והמנוע לא משבץ את החשבון,
// אבל ההיסטוריה של הצדדים האחרים (תרומות, מסלולים, משובים) נשמרת.
// הסיסמה נדרשת שוב, ואי אפשר למחוק באמצע עבודה - השרת מחזיר הודעה שמסבירה מה לסיים קודם.
export function DeleteAccountSection() {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const close = () => {
    if (deleting) return;
    setOpen(false);
    setPassword('');
    setUnderstood(false);
    setError('');
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDeleting(true);
    try {
      await dispatch(deleteAccount({ password })).unwrap();
    } catch (err) {
      const payload = toErrorPayload(err, 'מחיקת החשבון נכשלה. נסו שוב.');
      // status 0 = אין תקשורת; אחרת ההודעה מהשרת (למשל מה צריך לסיים לפני המחיקה)
      setError(payload.status === 0 ? 'לא ניתן להתחבר לשרת. נסו שוב.' : payload.message);
      setDeleting(false);
      return;
    }
    // החשבון נמחק והטוקן כבר לא תקף - יוצאים ועוברים לדף ההתחברות עם הודעת סיום
    clearSession();
    window.location.href = '/app/login?deleted=1';
  };

  return (
    <>
      <Card
        sx={{
          p: { xs: 3, md: 5 },
          mt: 3,
          border: '1px solid',
          borderColor: 'error.light',
          boxShadow: 'none',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>מחיקת החשבון</Typography>
            <Typography color="text.secondary">
              אחרי המחיקה לא ניתן להתחבר לחשבון, ולא יגיעו אליו בקשות או תרומות חדשות.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteForeverOutlinedIcon />}
            onClick={() => setOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            מחיקת החשבון
          </Button>
        </Stack>
      </Card>

      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <form onSubmit={handleDelete}>
          <DialogTitle sx={{ fontWeight: 700 }}>למחוק את החשבון?</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 1 }}>מה יקרה אחרי המחיקה:</Typography>
            <Box component="ul" sx={{ mt: 0, mb: 2, paddingInlineStart: 3, color: 'text.secondary', lineHeight: 1.8 }}>
              <li>לא ניתן יהיה להתחבר עם המייל והסיסמה האלה, וכל החיבורים הפתוחים ינותקו.</li>
              <li>החשבון לא יקבל יותר בקשות איסוף, תרומות או שיבוצים חדשים.</li>
              <li>תרומות ומסלולים שכבר הסתיימו יישארו בהיסטוריה של מי שהשתתף בהם.</li>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              אם יש מסלול פעיל, תרומות שעדיין בטיפול או תרומות בדרך לעמותה, צריך לסיים אותם לפני המחיקה.
            </Alert>
            <Stack spacing={2}>
              <TextField
                label="הסיסמה שלך"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                autoFocus
                fullWidth
              />
              <FormControlLabel
                control={<Checkbox checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />}
                label="הבנתי שלא אוכל להתחבר לחשבון הזה יותר"
              />
            </Stack>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={close} disabled={deleting}>ביטול</Button>
            <Button type="submit" variant="contained" color="error" disabled={!password || !understood || deleting}>
              {deleting ? 'מוחק...' : 'מחיקת החשבון'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
