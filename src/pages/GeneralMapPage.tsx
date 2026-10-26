import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';
import { StaticMap, MAP_COLORS } from '../components/GoogleMapView';
import type { MapEntityView } from '../types/api';
import { getToken } from '../utils/auth';

type EntityKind = 'donor' | 'ngo' | 'volunteer' | 'other';

const KIND_LABELS: Record<EntityKind, string> = {
  donor: 'תורמים',
  ngo: 'עמותות',
  volunteer: 'מתנדבים',
  other: 'אחר',
};

// השם של כל סוג בשרת (MapEntityDto.type) - כך השרת יודע אילו סוגים להסתיר בתמונת המפה
const KIND_TO_TYPE: Record<EntityKind, string> = {
  donor: 'supplier',
  ngo: 'ngo',
  volunteer: 'volunteer',
  other: 'other',
};

// ממפה את סוג הישות שמגיע מהשרת לאחת מהקטגוריות
const getKind = (loc: MapEntityView): EntityKind => {
  const raw = String(loc.type || loc.entityType || loc.role || '').toLowerCase();
  if (raw.includes('supplier') || raw.includes('donor') || raw.includes('business')) return 'donor';
  if (raw.includes('ngo') || raw.includes('association') || raw.includes('charity')) return 'ngo';
  if (raw.includes('volunteer')) return 'volunteer';
  return 'other';
};

export function GeneralMapPage() {
  const [locations, setLocations] = useState<MapEntityView[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = getToken();
    fetch('/api/map/all-entities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then((data: MapEntityView[]) => {
        if (Array.isArray(data)) {
          setLocations(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת נתוני מפה:', err);
        setLoading(false);
      });
  }, []);

  // רק ישויות עם מיקום מוצגות כסיכה (0,0 = עדיין אין מיקום, כמו בשרת)
  const entities = useMemo(
    () =>
      locations
        .map((loc, index) => {
          const lat = Number(loc.latitude ?? loc.lat);
          const lng = Number(loc.longitude ?? loc.lng ?? loc.lon);
          return { loc, index, lat, lng, kind: getKind(loc) };
        })
        .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng) && !(e.lat === 0 && e.lng === 0)),
    [locations]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    entities.forEach(e => { c[e.kind] = (c[e.kind] || 0) + 1; });
    return c;
  }, [entities]);

  // הסוגים שהוסתרו נשלחים לשרת, והוא מחזיר תמונת מפה בלעדיהם
  const hiddenTypes = (Object.keys(KIND_LABELS) as EntityKind[])
    .filter(kind => hidden[kind])
    .map(kind => KIND_TO_TYPE[kind])
    .join(',');
  const mapSrc = '/api/map/all-entities/image' + (hiddenTypes ? `?hide=${hiddenTypes}` : '');

  if (loading) return <LoadingBlock text="טוען נתוני מוקדים במערכת..." />;

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
      <PageTitle
        eyebrow="ניהול מערכת"
        title="תמונת מצב מרחבית"
        subtitle="תצוגה מרכזית של תורמים, עמותות ומתנדבים הפזורים בשטח על גבי מפה."
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
        {(Object.keys(KIND_LABELS) as EntityKind[])
          .filter(kind => counts[kind])
          .map(kind => (
            <Chip
              key={kind}
              clickable
              onClick={() => setHidden(h => ({ ...h, [kind]: !h[kind] }))}
              variant={hidden[kind] ? 'outlined' : 'filled'}
              label={`${KIND_LABELS[kind]} (${counts[kind]})`}
              avatar={
                <Box
                  component="span"
                  sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: MAP_COLORS[kind], ml: 1 }}
                />
              }
              sx={{ opacity: hidden[kind] ? 0.55 : 1 }}
            />
          ))}
      </Box>

      <StaticMap src={mapSrc} alt="מפת התורמים, העמותות והמתנדבים" height={560} />

      <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
        {entities.length} מוקדים מוצגים על המפה
        {locations.length > entities.length ? ` (${locations.length - entities.length} ללא מיקום)` : ''}.
        לחיצה על קטגוריה מסתירה או מציגה אותה במפה.
      </Typography>
    </Box>
  );
}