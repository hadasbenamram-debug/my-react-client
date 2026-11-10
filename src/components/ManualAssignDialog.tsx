import {useEffect, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';
import {formatTime} from '../utils/format';
import type {AssignDonationResultDto, ManualAssignDto, ManualAssignmentOptionsDto, ManualVolunteerOptionDto} from '../types/api';

interface ManualAssignDialogProps {
    /** התרומה לשיבוץ. null = הדיאלוג סגור */
    donationId: number | null;
    onClose: () => void;
    /** נקרא אחרי שנשלחה הצעה למתנדב (עם ההודעה מהשרת) */
    onAssigned: (message: string) => void;
}

/**
 * תיקון 36: שיבוץ ידני של תרומה למתנדב שהמנהל בוחר (למשל אחרי אי-הגעה).
 * השרת מחזיר את המתנדבים המאושרים והזמינים, המתאימים ביותר ראשונים (מרחק, משמרת, קיבולת, אמינות),
 * ובונה למתנדב שנבחר מסלול רגיל (עמותה, זמנים) עם כל האילוצים. רק את מערכת השעות שלו אפשר לעקוף -
 * כשהמנהל תיאם איתו ("תיאמתי עם המתנדב").
 */
export default function ManualAssignDialog({donationId, onClose, onAssigned}: ManualAssignDialogProps) {
    const [options, setOptions] = useState<ManualAssignmentOptionsDto | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [ignoreSchedule, setIgnoreSchedule] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (donationId === null) return undefined;

        let cancelled = false;
        setOptions(null);
        setSelectedId(null);
        setIgnoreSchedule(false);
        setError(null);
        setLoading(true);

        fetch(`/api/matches/assign-donation/${donationId}/candidates`, {headers: authHeaders()})
            .then(async (res) => {
                if (!res.ok) throw new Error(await readErrorMessage(res, 'לא ניתן לטעון את רשימת המתנדבים.'));
                return (await res.json()) as ManualAssignmentOptionsDto;
            })
            .then((data) => {
                if (cancelled) return;
                setOptions(data);
                // המתאים ביותר מסומן מראש (השרת מחזיר אותם מהמתאים ביותר)
                const first = data.volunteers.find((v) => v.canAssign);
                if (first) setSelectedId(first.volunteerId);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'לא ניתן לטעון את רשימת המתנדבים.');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [donationId]);

    const selected = options?.volunteers.find((v) => v.volunteerId === selectedId) ?? null;
    const needsCoordination = selected !== null && !selected.availableBySchedule;

    const assign = async () => {
        if (donationId === null || !selected) return;
        setBusy(true);
        setError(null);
        try {
            const body: ManualAssignDto = {ignoreSchedule};
            const res = await fetch(`/api/matches/assign-donation/${donationId}/volunteer/${selected.volunteerId}`, {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                setError(await readErrorMessage(res, 'השיבוץ נכשל.'));
                return;
            }
            const result = (await res.json()) as AssignDonationResultDto;
            if (result.matched) {
                onAssigned(result.message);
            } else {
                setError(result.message || 'לא ניתן לשבץ את המתנדב הזה.');
            }
        } catch {
            setError('שגיאת תקשורת מול השרת.');
        } finally {
            setBusy(false);
        }
    };

    const volunteerRow = (v: ManualVolunteerOptionDto) => (
        <ListItemButton
            key={v.volunteerId}
            selected={v.volunteerId === selectedId}
            disabled={!v.canAssign}
            onClick={() => setSelectedId(v.volunteerId)}
            sx={{borderRadius: 2, mb: 0.75, alignItems: 'flex-start', border: '1px solid', borderColor: 'divider'}}
        >
            <Radio checked={v.volunteerId === selectedId} disabled={!v.canAssign} size="small" sx={{mt: -0.5, ml: 1}} />
            <Box sx={{flex: 1, minWidth: 0}}>
                <Stack direction="row" sx={{alignItems: 'center', flexWrap: 'wrap', gap: 1}}>
                    <Typography sx={{fontWeight: 500}}>{v.name}</Typography>
                    {v.phone && (
                        <Link
                            href={`tel:${v.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            underline="hover"
                            sx={{display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.9rem'}}
                        >
                            <PhoneOutlinedIcon sx={{fontSize: 16}} />
                            <span dir="ltr">{v.phone}</span>
                        </Link>
                    )}
                </Stack>
                <Stack direction="row" sx={{flexWrap: 'wrap', gap: 0.75, mt: 0.75}}>
                    <Chip
                        size="small"
                        label={v.distanceKm != null ? `${v.distanceKm.toFixed(1)} ק"מ${v.hasFreshLocation ? ' (מיקום עדכני)' : ''}` : 'מרחק לא ידוע'}
                    />
                    <Chip size="small" label={`עד ${v.maxCapacityKg.toLocaleString('he-IL')} ק"ג`} />
                    <Chip size="small" label={`אמינות ${v.reliabilityScore.toFixed(1)}`} />
                    <Chip
                        size="small"
                        color={v.availableBySchedule ? 'success' : 'default'}
                        variant={v.availableBySchedule ? 'filled' : 'outlined'}
                        label={v.availableBySchedule ? 'במשמרת זמינות' : 'מחוץ למשמרת'}
                        sx={v.availableBySchedule ? {color: '#fff'} : undefined}
                    />
                    {v.failedThisDonationBefore && <Chip size="small" color="warning" label="לא הגיע / דחה תרומה זו" />}
                </Stack>
                {v.note && (
                    <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 0.5}}>
                        {v.note}
                    </Typography>
                )}
            </Box>
        </ListItemButton>
    );

    return (
        <Dialog open={donationId !== null} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle>שיבוץ ידני - תרומה #{donationId}</DialogTitle>
            <DialogContent dividers>
                {loading && (
                    <Box sx={{py: 6, textAlign: 'center'}}>
                        <CircularProgress size={28} />
                    </Box>
                )}

                {options && (
                    <>
                        <Typography color="text.secondary">
                            <strong>איסוף:</strong> {options.supplierName ?? '—'}{options.pickupAddress ? ` · ${options.pickupAddress}` : ''}
                        </Typography>
                        <Typography color="text.secondary" sx={{mb: 2}}>
                            <strong>משקל:</strong> {options.weightKg.toLocaleString('he-IL')} ק"ג
                            {options.pickupDeadline ? ` · איסוף עד ${formatTime(options.pickupDeadline)}` : ''}
                        </Typography>

                        {options.problem && <Alert severity="warning" sx={{mb: 2}}>{options.problem}</Alert>}

                        {options.volunteers.length === 0 ? (
                            <Alert severity="info">אין כרגע מתנדבים מאושרים וזמינים (שרישיון הנהיגה שלהם בתוקף).</Alert>
                        ) : (
                            <List disablePadding sx={{maxHeight: 360, overflowY: 'auto', pr: 0.5}}>
                                {options.volunteers.map(volunteerRow)}
                            </List>
                        )}

                        <FormControlLabel
                            sx={{mt: 1.5}}
                            control={<Checkbox checked={ignoreSchedule} onChange={(e) => setIgnoreSchedule(e.target.checked)} />}
                            label="תיאמתי עם המתנדב (למשל בטלפון) - אפשר לשבץ גם מחוץ למשמרת הזמינות שלו"
                        />
                        {needsCoordination && !ignoreSchedule && (
                            <Typography variant="body2" color="warning.main">
                                למתנדב שנבחר אין משמרת זמינות מתאימה. כדאי להתקשר אליו, ואם הוא מסכים - לסמן "תיאמתי עם המתנדב".
                            </Typography>
                        )}
                        <Typography variant="body2" color="text.secondary" sx={{mt: 1}}>
                            המתנדב יקבל הצעה רגילה (התראה, מייל ו-SMS) עם המסלול והעמותה, ויצטרך לאשר אותה בזמן התגובה.
                        </Typography>
                    </>
                )}

                {error && <Alert severity="error" sx={{mt: 2}}>{error}</Alert>}
            </DialogContent>
            <DialogActions sx={{px: 3, py: 2}}>
                <Button onClick={onClose} disabled={busy}>ביטול</Button>
                <Button
                    variant="contained"
                    onClick={() => void assign()}
                    disabled={busy || !selected || !selected.canAssign || !!options?.problem}
                >
                    {busy ? 'שולח...' : 'שליחת הצעה למתנדב'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
