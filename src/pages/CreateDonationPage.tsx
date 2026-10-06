import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PageTitle from '../components/PageTitle.jsx';
import { FormSection, StatusAlert } from '../components/FormParts.jsx';

interface DonationCategoryLineDto {
  categoryId: number;
  quantity: number;
  weightKg: number;
}

interface CreateDonationDto {
  regionId: number;
  latitude: number;
  longitude: number;
  googlePlaceId: string;
  latestPickupTime: string;
  categories: DonationCategoryLineDto[];
}

export function CreateDonationPage() {
  const [regionId] = useState<number>(1);
  const [latitude] = useState<number>(31.7683);
  const [longitude] = useState<number>(35.2137);
  const [googlePlaceId] = useState<string>('default_place');

  const [latestPickupTime, setLatestPickupTime] = useState<string>('18:00');

  const [categories, setCategories] = useState<DonationCategoryLineDto[]>([
    { categoryId: 1, quantity: 10, weightKg: 20 }
  ]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const urlToken = queryParams.get('token');

    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleAddCategoryLine = () => {
    setCategories([...categories, { categoryId: 1, quantity: 1, weightKg: 1 }]);
  };

  const handleRemoveCategoryLine = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (index: number, field: keyof DonationCategoryLineDto, value: number) => {
    const updated = [...categories];
    updated[index] = { ...updated[index], [field]: value };
    setCategories(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('לא נמצא טוקן התחברות. אנא פתח את הקישור מחדש מהמייל.');
      setLoading(false);
      return;
    }

    const formattedPickupTime = latestPickupTime.length === 5 ? `${latestPickupTime}:00` : latestPickupTime;

    const donationData: CreateDonationDto = {
      regionId: Number(regionId),
      latitude: Number(latitude),
      longitude: Number(longitude),
      googlePlaceId,
      latestPickupTime: formattedPickupTime,
      categories
    };

    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(donationData)
      });

      if (response.ok) {
        setSuccessMessage('התרומה נוצרה בהצלחה ונשמרה במסד הנתונים!');
      } else {
        const errData = await response.json();
        const errorText = errData.errors
          ? Object.values(errData.errors).flat().join(', ')
          : (errData.message || 'שגיאה בשמירת התרומה בשרת.');
        setError(errorText);
      }
    } catch (err) {
      console.error('שגיאת תקשורת:', err);
      setError('שגיאת תקשורת מול השרת.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <PageTitle
        eyebrow="ארגון תורם"
        title="יצירת תרומה חדשה"
        subtitle="מלאו את פרטי התרומה, והמערכת תתאים לה מתנדב ועמותה."
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="זמני איסוף" columns={1}>
            <Tooltip title="השעה האחרונה שבה אפשר לאסוף את התרומה מהמקום." placement="bottom-start" arrow>
              <TextField
                label="שעת איסוף אחרונה"
                type="time"
                value={latestPickupTime}
                onChange={(e) => setLatestPickupTime(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                required
              />
            </Tooltip>
          </FormSection>

          <Typography
            sx={{
              mt: 4,
              mb: 2.5,
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'primary.dark',
              fontWeight: 500,
            }}
          >
            פרטי מוצרים בתרומה
          </Typography>

          {categories.map((cat, index) => (
            <Box
              key={index}
              sx={{
                p: 2.5,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 3,
                position: 'relative',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontWeight: 500 }}>מוצר {index + 1}</Typography>
                {categories.length > 1 && (
                  <Tooltip title="הסר מוצר" arrow>
                    <IconButton size="small" onClick={() => handleRemoveCategoryLine(index)} aria-label="הסר מוצר">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
                <TextField
                  label="מזהה קטגוריה"
                  type="number"
                  value={cat.categoryId}
                  onChange={(e) => handleCategoryChange(index, 'categoryId', Number(e.target.value))}
                />
                <TextField
                  label="כמות יחידות"
                  type="number"
                  value={cat.quantity}
                  onChange={(e) => handleCategoryChange(index, 'quantity', Number(e.target.value))}
                  error={cat.quantity <= 0}
                  helperText={cat.quantity <= 0 ? 'יש להזין כמות גדולה מאפס' : ' '}
                />
                <TextField
                  label='משקל (ק"ג)'
                  type="number"
                  value={cat.weightKg}
                  onChange={(e) => handleCategoryChange(index, 'weightKg', Number(e.target.value))}
                  slotProps={{ htmlInput: { step: 'any' } }}
                  error={cat.weightKg <= 0}
                  helperText={cat.weightKg <= 0 ? 'יש להזין משקל גדול מאפס' : ' '}
                />
              </Box>
            </Box>
          ))}

          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddCategoryLine} sx={{ mt: 1 }}>
            הוסף סוג מוצר נוסף
          </Button>

          <Box sx={{ mt: 4 }}>
            <Button type="submit" variant="contained" size="large" fullWidth disabled={loading}>
              {loading ? 'שומר...' : 'פרסם תרומה חדשה'}
            </Button>
          </Box>
        </form>

        {error && <StatusAlert message={error} success={false} />}
        {successMessage && <StatusAlert message={successMessage} success />}
      </Card>
    </Box>
  );
}
