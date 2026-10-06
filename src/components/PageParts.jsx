import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

// מצב טעינה אחיד לכל הדפים
export function LoadingBlock({text}) {
    return (
        <Box sx={{textAlign: 'center', py: 10}}>
            <CircularProgress size={32} />
            {text ? (
                <Typography color="text.secondary" sx={{mt: 2}}>
                    {text}
                </Typography>
            ) : null}
        </Box>
    );
}

// כרטיס "אין נתונים" אחיד
export function EmptyState({text}) {
    return (
        <Card sx={{p: 4, textAlign: 'center'}}>
            <Typography color="text.secondary">{text}</Typography>
        </Card>
    );
}
