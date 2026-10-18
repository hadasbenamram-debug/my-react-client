import { useState } from 'react';
import Box from '@mui/material/Box';
import { imageUrl } from '../utils/images';

interface DonationImageProps {
    /** שם קובץ התמונה כפי שהשרת החזיר (image). בלי ערך - לא מוצג כלום. */
    image: string | null | undefined;
    /** thumb - תמונה קטנה ברשימות; large - בעמוד הפרטים */
    size?: 'thumb' | 'large';
}

// תמונת תרומה: הכתובת = כתובת תיקיית התמונות בשרת + שם הקובץ
export default function DonationImage({ image, size = 'thumb' }: DonationImageProps) {
    const [failed, setFailed] = useState(false);
    const src = imageUrl(image);
    if (!src || failed) return null;

    const isThumb = size === 'thumb';

    return (
        <Box
            component="img"
            src={src}
            alt="תמונת התרומה"
            loading="lazy"
            onError={() => setFailed(true)}
            sx={{
                display: 'block',
                width: isThumb ? 72 : '100%',
                height: isThumb ? 72 : 'auto',
                maxHeight: isThumb ? undefined : 320,
                objectFit: 'cover',
                borderRadius: isThumb ? '10px' : '14px',
                border: '1px solid',
                borderColor: 'divider',
                flexShrink: 0,
            }}
        />
    );
}
