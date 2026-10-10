import React, { useState, useEffect, useMemo } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import PageTitle from '../components/PageTitle.jsx';
import { LoadingBlock, EmptyState } from '../components/PageParts.jsx';
import { MapShell, MapView, MAP_COLORS, useGeocodedStops } from '../components/GoogleMapView.jsx';

function RouteMap({ stops }: { stops: any[] }) {
  const geocoded = useGeocodedStops(stops);

  const markers = useMemo(
    () =>
      geocoded
        .map((stop: any, index: number) => ({ stop, index }))
        .filter(({ stop }: any) => stop.position)
        .map(({ stop, index }: any) => ({
          id: index,
          position: stop.position,
          title: stop.locationName,
          glyph: String(index + 1),
          color: stop.actionType === 'Pickup' ? MAP_COLORS.donor : MAP_COLORS.ngo,
          info: (
            <Box>
              <Typography sx={{ fontWeight: 700 }}>
                {index + 1}. {stop.locationName}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem' }}>
                {stop.actionType === 'Pickup' ? 'איסוף מספק' : 'מסירה לעמותה'}
              </Typography>
              {stop.address && <Typography sx={{ fontSize: '0.85rem' }}>{stop.address}</Typography>}
            </Box>
          ),
        })),
    [geocoded]
  );

  const routePoints = useMemo(() => markers.map((m: any) => m.position), [markers]);

  return <MapView markers={markers} routePoints={routePoints} />;
}

export function VrpRouteVisualizationPage() {
  const [routePlan, setRoutePlan] = useState<any>({
    routeId: 0,
    stops: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/routing/current-plan', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setRoutePlan(data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('שגיאה בטעינת תוכנית המסלול:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <LoadingBlock text="מחשב מסלול אופטימלי (VRP)..." />;

  const stops: any[] = routePlan.stops || [];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <PageTitle
        eyebrow="מסלולים"
        title="תכנון והמחשת מסלול איסוף"
        subtitle="סדר תחנות מחושב עבור המסלול הנוכחי להשגת יעילות מירבית."
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <Chip variant="outlined" color="primary" label={`מסלול #${routePlan.routeId || 'N/A'}`} />
        <Chip variant="outlined" label={`${stops.length} תחנות`} />
      </Box>

      {stops.length > 0 && (
        <MapShell height={460}>
          <RouteMap stops={stops} />
        </MapShell>
      )}

      {stops.length === 0 ? (
        <EmptyState text="אין תחנות מוגדרות במסלול כרגע." />
      ) : (
        stops.map((stop: any, index: number) => (
          <Card key={index} sx={{ p: 2.5, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Avatar
              sx={{
                bgcolor: stop.actionType === 'Pickup' ? MAP_COLORS.donor : MAP_COLORS.ngo,
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {index + 1}
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 500 }}>
                {stop.locationName}
                <Chip
                  size="small"
                  variant="outlined"
                  label={stop.actionType === 'Pickup' ? 'איסוף ספק' : 'מסירה לעמותה'}
                  sx={{ mr: 1.5 }}
                />
              </Typography>
              <Typography color="text.secondary">{stop.address}</Typography>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}