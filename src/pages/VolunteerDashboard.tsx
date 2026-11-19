import {useCallback, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DashboardGreeting from '../components/DashboardGreeting';
import {LoadingBlock} from '../components/PageParts';
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import {useAutoRefresh} from '../components/LiveUpdates';
import {useAppDispatch, useAppSelector} from '../store';
import {fetchMyActiveRoute, selectActiveRoute, selectActiveRouteError, selectActiveRouteStatus} from '../store/volunteerSlice';

export function VolunteerDashboard() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const route = useAppSelector(selectActiveRoute);
    const status = useAppSelector(selectActiveRouteStatus);
    const error = useAppSelector(selectActiveRouteError);
    const loading = status === 'idle' || status === 'loading';

    useEffect(() => {
        void dispatch(fetchMyActiveRoute({silent: false}));
    }, [dispatch]);

    // תיקון 50: בקשה חדשה / שינוי במסלול מתעדכנים לבד (התראה מהשרת, כל דקה, וכשחוזרים ללשונית)
    const refreshSilently = useCallback(() => {
        void dispatch(fetchMyActiveRoute({silent: true}));
    }, [dispatch]);
    useAutoRefresh(refreshSilently);

    if (loading) return <LoadingBlock text="טוען..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            {/* תיקון 70: ברכה אישית במקום "הדשבורד שלי" */}
            <DashboardGreeting eyebrow="מתנדב" />
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            {!route ? (
                <Card sx={{p: {xs: 3, md: 4}, textAlign: 'center'}}>
                    <Typography color="text.secondary" sx={{mb: 1}}>אין כרגע בקשה או מסלול פעיל.</Typography>
                    {/* תיקון 45: בקשה חדשה תקפוץ כאן ובכל דף באתר, וגם תישלח במייל */}
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        כשתגיע בקשת איסוף חדשה היא תופיע כאן מיד (וגם במייל). חשוב שהזמינות השבועית שלך תהיה מעודכנת.
                    </Typography>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1.5} sx={{justifyContent: 'center'}}>
                        <Button variant="outlined" onClick={() => navigate('/app/volunteer/availability')}>עדכון זמינות שבועית</Button>
                        {/* תיקון 70: הוסר "היסטוריית השיבוצים שלי" - הוא בתפריט */}
                    </Stack>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {route.awaitingResponse ? (
                        <Alert severity="warning" action={<Button color="inherit" onClick={() => navigate('/app/volunteer/incoming-request')}>לבקשה</Button>}>
                            מחכה לך בקשת איסוף חדשה. <DeadlineCountdown deadline={route.responseDeadline} secondsLeft={route.responseSecondsLeft} />
                        </Alert>
                    ) : (
                        <Alert severity="success" action={<Button color="inherit" onClick={() => navigate('/app/volunteer/active-route')}>למסלול</Button>}>
                            יש לך מסלול פעיל.
                        </Alert>
                    )}
                    {/* תיקון 74: כפתור לפרטי כל תרומה במסלול */}
                    <RouteSummary route={route} donationRole="volunteer" />
                </Stack>
            )}
        </Box>
    );
}
