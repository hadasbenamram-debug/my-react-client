import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {alpha} from '@mui/material/styles';
import type {ReactNode} from 'react';
import {Link as RouterLink} from 'react-router-dom';

// מצב טעינה אחיד לכל הדפים
export interface LoadingBlockProps {
    text?: ReactNode;
}

export function LoadingBlock({text}: LoadingBlockProps) {
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
// תיקון 76: מסך ריק אומר למשתמש מה הצעד הבא - כותרת, הסבר, אייקון וכפתור פעולה (כולם אופציונליים).
// בלי הפרמטרים החדשים הכרטיס נראה בדיוק כמו קודם, כך שדפים שלא שונו לא מושפעים.
export interface EmptyStateAction {
    label: string;
    /** מעבר לדף אחר באתר */
    to?: string;
    /** פעולה בתוך הדף (למשל ניקוי החיפוש) */
    onClick?: () => void;
}

export interface EmptyStateProps {
    text: ReactNode;
    title?: ReactNode;
    icon?: ReactNode;
    action?: EmptyStateAction;
    secondaryAction?: EmptyStateAction;
}

function EmptyStateButton({action, primary}: {action: EmptyStateAction; primary: boolean}) {
    const variant = primary ? 'contained' : 'outlined';
    if (action.to) {
        return (
            <Button component={RouterLink} to={action.to} variant={variant}>
                {action.label}
            </Button>
        );
    }
    return (
        <Button onClick={action.onClick} variant={variant}>
            {action.label}
        </Button>
    );
}

export function EmptyState({text, title, icon, action, secondaryAction}: EmptyStateProps) {
    // בלי כותרת, אייקון ופעולות - הכרטיס הפשוט הקודם
    if (!title && !icon && !action && !secondaryAction) {
        return (
            <Card sx={{p: 4, textAlign: 'center'}}>
                <Typography color="text.secondary">{text}</Typography>
            </Card>
        );
    }

    return (
        <Card sx={{p: {xs: 3, md: 5}, textAlign: 'center'}}>
            <Stack spacing={1.5} sx={{alignItems: 'center'}}>
                {icon ? (
                    <Box
                        aria-hidden="true"
                        sx={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            color: 'primary.main',
                            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                            mb: 0.5,
                            '& svg': {fontSize: 36},
                        }}
                    >
                        {icon}
                    </Box>
                ) : null}
                {title ? (
                    <Typography component="p" sx={{fontWeight: 700, fontSize: '1.15rem'}}>
                        {title}
                    </Typography>
                ) : null}
                <Typography color="text.secondary" sx={{maxWidth: 480, lineHeight: 1.7}}>
                    {text}
                </Typography>
                {action || secondaryAction ? (
                    <Stack
                        direction={{xs: 'column', sm: 'row'}}
                        spacing={1.5}
                        sx={{pt: 1.5, width: {xs: '100%', sm: 'auto'}}}
                    >
                        {action ? <EmptyStateButton action={action} primary /> : null}
                        {secondaryAction ? <EmptyStateButton action={secondaryAction} primary={false} /> : null}
                    </Stack>
                ) : null}
            </Stack>
        </Card>
    );
}
