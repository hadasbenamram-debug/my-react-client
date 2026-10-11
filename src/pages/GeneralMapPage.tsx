import React, { useState, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle';
import { LoadingBlock } from '../components/PageParts';
import { MapShell, MapView, MAP_COLORS } from '../components/GoogleMapView';

type EntityKind = 'donor' | 'ngo' | 'volunteer' | 'other';

const KIND_LABELS: Record<EntityKind, string> = {
  donor: 'תורמים',
  ngo: 'עמותות',
  volunteer: 'מתנדבים',
  other: 'אחר',
};

// ממפה את סוג הישות שמגיע מהשרת לאחת מהקטגוריות
const getKind = (loc: any): EntityKind => {
  const raw = String(loc.type || loc.entityType || loc.role || '').toLowerCase();
  if (raw.includes('supplier') || raw.includes('donor') || raw.includes('business')) return 'donor';
  if (raw.includes('ngo') || raw.includes('association') || raw.includes('charity')) return 'ngo';
  if (raw.includes('volunteer')) return 'volunteer';
  return 'other';
};

export function GeneralMapPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/map/all-entities', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
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

  // רק ישויות עם קואורדינטות תקינות מוצגות כסיכה
  const entities = useMemo(
    () =>
      locations
        .map((loc, index) => {
          const lat = Number(loc.latitude ?? loc.lat);
          const lng = Number(loc.longitude ?? loc.lng ?? loc.lon);
          return { loc, index, lat, lng, kind: getKind(loc) };
        })
        .filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lng)),
    [locations]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    entities.forEach(e => { c[e.kind] = (c[e.kind] || 0) + 1; });
    return c;
  }, [entities]);

  const markers = useMemo(
    () =>
      entities
        .filter(e => !hidden[e.kind])
        .map(e => ({
          id: `${e.kind}-${e.loc.id ?? e.index}`,
          position: { lat: e.lat, lng: e.lng },
          title: e.loc.name || e.loc.title || KIND_LABELS[e.kind],
          color: MAP_COLORS[e.kind],
          info: (
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{e.loc.name || e.loc.title || KIND_LABELS[e.kind]}</Typography>
              <Typography sx={{ fontSize: '0.85rem' }}>{KIND_LABELS[e.kind]}</Typography>
              {e.loc.address && <Typography sx={{ fontSize: '0.85rem' }}>{e.loc.address}</Typography>}
            </Box>
          ),
        })),
    [entities, hidden]
  );

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

      <MapShell height={560}>
        <MapView markers={markers} />
      </MapShell>

      <Typography color="text.secondary" sx={{ fontSize: '0.9rem' }}>
        {entities.length} מוקדים מוצגים על המפה
        {locations.length > entities.length ? ` (${locations.length - entities.length} ללא מיקום)` : ''}.
        לחיצה על סיכה מציגה פרטים, ולחיצה על קטגוריה מסתירה או מציגה אותה.
      </Typography>
    </Box>
  );
}