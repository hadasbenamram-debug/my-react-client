import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import PageTitle from '../components/PageTitle';
import { LoadingBlock, EmptyState } from '../components/PageParts';
import { MAP_COLORS } from '../components/GoogleMapView';
import LiveRouteMap from '../components/LiveRouteMap';
import type { LiveMissionDto, RouteDto, RouteStop, RoutePlan } from '../types/api';
import { authHeaders } from '../utils/auth';

// מפה אינטראקטיבית של המסלול (בלי מפתח דפדפן - תמונת המפה מהשרת).
// התחנות ממוספרות באותו סדר כמו ברשימה שמתחת למפה, והעמותה אחרונה.

// המחשת מסלול (מנהל). תוקן: העמוד פנה ל-api/routing/current-plan שלא קיים.
// עכשיו: המסלולים הפעילים מהמוניטור, והתחנות של המסלול שנבחר מ-api/matches/routes/{id}.
const toPlan = (route: RouteDto): RoutePlan => ({
  routeId: route.id,
  stops: [
    ...route.stops.map((s): RouteStop => ({
      locationName: s.supplierName ?? `תרומה #${s.donationId}`,
      actionType: 'Pickup',
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
    })),
    { locationName: route.ngoName ?? 'עמותה', actionType: 'Dropoff', address: route.ngoAddress, latitude: route.ngoLatitude, longitude: route.ngoLongitude },
  ],
});

export function VrpRouteVisualizationPage() {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<LiveMissionDto[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [route, setRoute] = useState<RouteDto | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlan>({ routeId: 0, stops: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/live-monitor', { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as LiveMissionDto[]) : []))
      .then((list) => {
        setMissions(list);
        if (list.length > 0) setSelectedId(list[0].id);
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedId == null) return;
    setLoading(true);
    fetch(`/api/matches/routes/${selectedId}`, { headers: authHeaders() })
      .then(async (res) => (res.ok ? ((await res.json()) as RouteDto) : null))
      .then((loaded) => {
        setRoute(loaded);
        setRoutePlan(loaded ? toPlan(loaded) : { routeId: selectedId, stops: [] });
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  if (loading) return <LoadingBlock text="מחשב מסלול אופטימלי (VRP)..." />;

  const stops: RouteStop[] = routePlan.stops || [];

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
      <PageTitle
        eyebrow="מסלולים"
        title="תכנון והמחשת מסלול איסוף"
        subtitle="סדר תחנות מחושב עבור המסלול הנוכחי להשגת יעילות מירבית."
      />

      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        {missions.map((m) => (
          <Chip key={m.id} clickable color={m.id === selectedId ? 'primary' : 'default'}
            variant={m.id === selectedId ? 'filled' : 'outlined'}
            label={`מסלול #${m.id} · ${m.volunteerName}`} onClick={() => setSelectedId(m.id)} />
        ))}
        <Chip variant="outlined" label={`${stops.length} תחנות`} />
        {route && (
          <Button size="small" variant="outlined" startIcon={<MyLocationIcon />} onClick={() => navigate(`/app/track/${route.id}`)}>
            מעקב חי
          </Button>
        )}
      </Box>

      {route && stops.length > 0 && (
        <LiveRouteMap
          route={route}
          current={route.volunteerLatitude != null && route.volunteerLongitude != null
            ? { lat: route.volunteerLatitude, lng: route.volunteerLongitude }
            : null}
          height={460}
          fallbackSrc={`/api/map/routes/${route.id}/image`}
        />
      )}

      {stops.length === 0 ? (
        <EmptyState text={missions.length === 0 ? 'אין מסלולים פעילים כרגע.' : 'אין תחנות במסלול שנבחר.'} />
      ) : (
        stops.map((stop: RouteStop, index: number) => (
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