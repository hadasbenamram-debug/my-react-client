import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
    columns?: number;
}

// כותרת קבוצת שדות + רשת שדות (עמודה אחת בנייד, שתיים במסך רחב)
export function FormSection({ title, children, columns = 2 }: FormSectionProps) {
    return (
        <Box sx={{ mb: 1 }}>
            <Typography
                sx={{
                    mb: 2.5,
                    fontSize: '0.7rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'primary.dark',
                    fontWeight: 500,
                }}
            >
                {title}
            </Typography>
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: `repeat(${columns}, 1fr)` },
                    gap: 3,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

interface StatusAlertProps {
    message?: string | null;
    success?: boolean;
}

// הודעת סטטוס: ירוק אם ההודעה כוללת "בהצלחה", אחרת אדום (אותה לוגיקה שהייתה בדפים)
export function StatusAlert({ message, success }: StatusAlertProps) {
    if (!message) {
        return null;
    }
    const isSuccess = success !== undefined ? success : message.includes('בהצלחה');
    return (
        <Alert severity={isSuccess ? 'success' : 'error'} sx={{ mt: 3 }}>
            {message}
        </Alert>
    );
}