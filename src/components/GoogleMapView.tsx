import React, {useEffect, useState} from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import {authHeaders} from '../utils/auth';
import {readErrorMessage} from '../utils/apiError';

// המפות מגיעות מהשרת כתמונה (Google Maps Static API). המפתח של Google נמצא רק בשרת,
// ולכן אין כאן מפתח, אין קובץ .env ואין טעינה של Google Maps בדפדפן.

export type MapEntityKind = 'donor' | 'ngo' | 'volunteer' | 'other';

// אותם צבעים שהשרת משתמש בהם לסיכות (MapService), כדי שהמקרא יתאים למפה
export const MAP_COLORS: Record<MapEntityKind, string> = {
    donor: '#e08a1e', // תורם
    ngo: '#159aa0', // עמותה
    volunteer: '#33383a', // מתנדב
    other: '#8a8f91',
};

export interface StaticMapProps {
    /** כתובת ה-API שמחזירה את תמונת המפה, למשל /api/map/routes/5/image */
    src: string;
    /** תיאור התמונה (נגישות) */
    alt: string;
    /** גובה המקום שנשמר למפה בזמן הטעינה */
    height?: number;
}

// מביא את תמונת המפה מהשרת עם הטוקן (תגית img לא יכולה לשלוח כותרת Authorization) ומציג אותה
export function StaticMap({src, alt, height = 480}: StaticMapProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        let objectUrl: string | null = null;
        setImageUrl(null);
        setError(null);

        fetch(src, {headers: authHeaders()})
            .then(async (res) => {
                if (!res.ok) {
                    throw new Error(await readErrorMessage(res, 'לא ניתן להציג את המפה כרגע.'));
                }
                return res.blob();
            })
            .then((blob) => {
                if (cancelled) return;
                objectUrl = URL.createObjectURL(blob);
                setImageUrl(objectUrl);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : 'לא ניתן להציג את המפה כרגע.');
            });

        return () => {
            cancelled = true;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [src]);

    if (error) {
        return <Alert severity="warning" sx={{mb: 3}}>{error}</Alert>;
    }

    return (
        <Card sx={{p: 0, mb: 3, overflow: 'hidden'}}>
            {imageUrl ? (
                <Box component="img" src={imageUrl} alt={alt} sx={{display: 'block', width: '100%', height: 'auto'}} />
            ) : (
                <Box sx={{height: {xs: Math.min(height, 380), md: height}, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <CircularProgress />
                </Box>
            )}
        </Card>
    );
}
