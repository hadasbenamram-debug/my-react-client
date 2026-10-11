import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PageTitleProps {
    eyebrow?: string;
    title: string;
    subtitle?: string;
}

// כותרת דף בסגנון מסך הפתיחה: eyebrow טורקיז קטן + כותרת דקה
export default function PageTitle({ eyebrow, title, subtitle }: PageTitleProps) {
    return (
        <Box sx={{ mb: 4 }}>
            {eyebrow ? (
                <Typography
                    sx={{
                        mb: 1,
                        fontSize: '0.7rem',
                        letterSpacing: '0.22em',
                        textTransform: 'uppercase',
                        color: 'primary.dark',
                        fontWeight: 500,
                    }}
                >
                    {eyebrow}
                </Typography>
            ) : null}
            <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '3rem' } }}>
                {title}
            </Typography>
            {subtitle ? (
                <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: '40rem' }}>
                    {subtitle}
                </Typography>
            ) : null}
        </Box>
    );
}