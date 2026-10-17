import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import type {ReactNode} from 'react';

// רשת כרטיסי מספרים (דשבורדים). כל כרטיס: {label, value, icon, tone}
// tone: 'primary' (ברירת מחדל) | 'warning' | 'error'
export type StatTone = 'primary' | 'warning' | 'error';

interface ToneStyle {
    color: string;
    number: string;
    border: string | undefined;
    bg: string | undefined;
}

export interface StatGridCard {
    label: string;
    value: ReactNode;
    icon?: ReactNode;
    tone?: StatTone;
}

interface StatGridProps {
    cards: StatGridCard[];
    columns?: number;
}

const TONES: Record<StatTone, ToneStyle> = {
    primary: {color: 'primary.dark', number: 'primary.main', border: undefined, bg: undefined},
    warning: {color: 'warning.main', number: 'warning.main', border: 'warning.light', bg: '#fff8ec'},
    error: {color: 'error.main', number: 'error.main', border: 'error.light', bg: '#fdf3f3'},
};

export default function StatGrid({cards, columns = 3}: StatGridProps) {
    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, 1fr)', md: `repeat(${columns}, 1fr)`},
                gap: 2.5,
            }}
        >
            {cards.map((card) => {
                const tone = TONES[card.tone || 'primary'];
                return (
                    <Card
                        key={card.label}
                        sx={{p: 3.5, textAlign: 'center', borderColor: tone.border, backgroundColor: tone.bg}}
                    >
                        {card.icon ? <Box sx={{color: tone.color, mb: 1}}>{card.icon}</Box> : null}
                        <Typography
                            sx={{
                                direction: 'ltr',
                                fontSize: {xs: '2.4rem', md: '3rem'},
                                fontWeight: 700,
                                lineHeight: 1,
                                letterSpacing: '-0.02em',
                                color: tone.number,
                                fontVariantNumeric: 'tabular-nums',
                            }}
                        >
                            {card.value}
                        </Typography>
                        <Typography color="text.secondary" sx={{mt: 1.5, fontSize: '0.95rem'}}>
                            {card.label}
                        </Typography>
                    </Card>
                );
            })}
        </Box>
    );
}
