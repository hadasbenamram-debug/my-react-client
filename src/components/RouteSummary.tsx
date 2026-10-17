import {useEffect, useState} from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type {ReactNode} from 'react';
import type {RouteDto, RouteStopDto} from '../types/api';
import {formatTime, formatTimeSpan, MATCH_STATUS_LABELS, secondsUntil} from '../utils/format';

// ספירה לאחור עד מועד התגובה שהשרת קבע (ResponseDeadline) - לא 5 דקות קבועות בצד הלקוח
export function DeadlineCountdown({deadline, onExpire}: {deadline: string | null; onExpire?: () => void}) {
    const [left, setLeft] = useState(() => secondsUntil(deadline));

    useEffect(() => {
        setLeft(secondsUntil(deadline));
        const timer = setInterval(() => {
            const next = secondsUntil(deadline);
            setLeft(next);
            if (next <= 0) {
                clearInterval(timer);
                onExpire?.();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [deadline, onExpire]);

    if (!deadline) return null;
    const mm = Math.floor(left / 60).toString().padStart(2, '0');
    const ss = (left % 60).toString().padStart(2, '0');

    return (
        <Chip
            icon={<AccessTimeIcon />}
            color={left <= 60 ? 'error' : 'default'}
            variant="outlined"
            label={left > 0 ? `זמן נותר לאישור: ${mm}:${ss}` : 'זמן התגובה הסתיים'}
        />
    );
}

export interface RouteSummaryProps {
    route: RouteDto;
    /** פעולות לכל תחנה (למשל "נאסף" / "נמסר") */
    stopActions?: (stop: RouteStopDto) => ReactNode;
}

// כל פרטי המסלול: תחנות האיסוף לפי הסדר, מה לאסוף, זמני הגעה, והעמותה ביעד
export default function RouteSummary({route, stopActions}: RouteSummaryProps) {
    return (
        <Card sx={{p: {xs: 2.5, md: 3.5}}}>
            <Stack direction="row" spacing={1} sx={{flexWrap: 'wrap', gap: 1, mb: 2}}>
                <Chip label={`${route.stops.length} תחנות איסוף`} />
                <Chip label={`${route.totalWeightKg.toFixed(1)} ק"ג`} />
                {route.estimatedTotalDistanceKm != null && <Chip label={`${route.estimatedTotalDistanceKm.toFixed(1)} ק"מ`} />}
                {route.estimatedTotalDurationMinutes != null && <Chip label={`כ-${Math.round(route.estimatedTotalDurationMinutes)} דק'`} />}
                <Chip color="primary" variant="outlined" label={`ציון התאמה ${route.matchScore.toFixed(0)}`} />
            </Stack>

            {route.stops.map((stop) => (
                <Box key={stop.matchId} sx={{py: 1.5}}>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={1} sx={{justifyContent: 'space-between'}}>
                        <Box>
                            <Typography sx={{fontWeight: 700}}>
                                {stop.order}. איסוף מ{stop.supplierName || 'ספק'}
                            </Typography>
                            <Typography color="text.secondary">{stop.address || '—'}</Typography>
                            <Typography variant="body2">
                                הגעה משוערת: {formatTime(stop.estimatedArrival)} · איסוף עד {formatTimeSpan(stop.latestPickupTime)} · {stop.weightKg.toFixed(1)} ק"ג
                            </Typography>
                            {stop.items.length > 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    {stop.items.map((i) => `${i.categoryName ?? 'פריט'} ×${i.quantity}`).join(' · ')}
                                </Typography>
                            )}
                        </Box>
                        <Stack spacing={1} sx={{alignItems: {sm: 'flex-end'}}}>
                            <Chip size="small" label={MATCH_STATUS_LABELS[stop.status] ?? stop.status} />
                            {stopActions?.(stop)}
                        </Stack>
                    </Stack>
                    <Divider sx={{mt: 1.5}} />
                </Box>
            ))}

            <Box sx={{pt: 1.5}}>
                <Typography sx={{fontWeight: 700}}>יעד: {route.ngoName || 'עמותה'}</Typography>
                <Typography color="text.secondary">{route.ngoAddress || '—'}</Typography>
                <Typography variant="body2">הגעה משוערת לעמותה: {formatTime(route.estimatedNgoArrival)}</Typography>
            </Box>
        </Card>
    );
}
