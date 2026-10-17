import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import {LoadingBlock} from '../components/PageParts';
import RouteSummary, {DeadlineCountdown} from '../components/RouteSummary';
import {authHeaders} from '../utils/auth';
import type {RouteDto} from '../types/api';

export function VolunteerDashboard() {
    const navigate = useNavigate();
    const [route, setRoute] = useState<RouteDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/matches/routes/my-active', {headers: authHeaders()})
            .then(async (res) => {
                if (res.status === 204) return null;
                if (!res.ok) throw new Error();
                return (await res.json()) as RouteDto;
            })
            .then(setRoute)
            .catch(() => setError('שגיאה בטעינת הנתונים.'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingBlock text="טוען..." />;

    return (
        <Box sx={{maxWidth: 800, mx: 'auto'}}>
            <PageTitle eyebrow="מתנדב" title="הדשבורד שלי" subtitle="הבקשה או המסלול הפעיל שלך." />
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            {!route ? (
                <Card sx={{p: {xs: 3, md: 4}, textAlign: 'center'}}>
                    <Typography color="text.secondary" sx={{mb: 2}}>אין כרגע בקשה או מסלול פעיל.</Typography>
                    <Button variant="outlined" onClick={() => navigate('/app/volunteer/availability')}>עדכון זמינות שבועית</Button>
                </Card>
            ) : (
                <Stack spacing={2}>
                    {route.awaitingResponse ? (
                        <Alert severity="warning" action={<Button color="inherit" onClick={() => navigate('/app/volunteer/incoming-request')}>לבקשה</Button>}>
                            מחכה לך בקשת איסוף חדשה. <DeadlineCountdown deadline={route.responseDeadline} />
                        </Alert>
                    ) : (
                        <Alert severity="success" action={<Button color="inherit" onClick={() => navigate('/app/volunteer/active-route')}>למסלול</Button>}>
                            יש לך מסלול פעיל.
                        </Alert>
                    )}
                    <RouteSummary route={route} />
                </Stack>
            )}
        </Box>
    );
}
