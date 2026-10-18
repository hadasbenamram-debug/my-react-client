import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import type { FoodCategoryResponseDto, ImageAnalysisResponseDto, RegionResponseDto, SupplierResponseDto, ValidationProblemBody } from '../types/api';

interface DonationCategoryLineDto {
  categoryId: number | '';
  quantity: number;
  weightKg: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

/** פריט שה-AI זיהה בתמונה (תוכן aiParsedData אחרי JSON.parse) */
interface AiParsedItem {
  categoryId?: number | string;
  quantity?: number | string;
  weightKg?: number | string;
  error?: string;
}

/** תשובת analyze-image: לפי ה-DTO aiParsedData הוא string, אבל הקוד תומך גם באובייקט מוכן */
type AnalyzeImageResponse = Partial<Omit<ImageAnalysisResponseDto, 'aiParsedData'>> & {
  aiParsedData?: string | AiParsedItem | AiParsedItem[] | null;
};

export function CreateDonationPage() {
  // אזור האיסוף נבחר מתוך האזורים שבמסד (GET api/region), ולא מזהה קבוע.
  // מיקום האיסוף: הכתובת של העסק (GET api/suppliers/current), ואם אין - מרכז האזור שנבחר.
  const [availableRegions, setAvailableRegions] = useState<RegionResponseDto[]>([]);
  const [regionId, setRegionId] = useState<number | ''>('');
  const [supplierLocation, setSupplierLocation] = useState<{ lat: number; lng: number } | null>(null);
  const selectedRegion = availableRegions.find((r) => r.id === regionId);
  const latitude = supplierLocation?.lat ?? selectedRegion?.centerLatitude ?? 0;
  const longitude = supplierLocation?.lng ?? selectedRegion?.centerLongitude ?? 0;
  const [googlePlaceId] = useState<string>('default_place');

  const [latestPickupTime, setLatestPickupTime] = useState<string>('18:00');
  // חדש: שעת תפוגה (אופציונלי). בלי ערך - סוף היום (תרומה מיועדת לאותו יום בלבד)
  const [expirationTime, setExpirationTime] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  // שם קובץ התמונה שהשרת שמר (לא נתיב ולא כתובת)
  const [imageFileName, setImageFileName] = useState<string>('');

  const [categories, setCategories] = useState<DonationCategoryLineDto[]>([
    { categoryId: '', quantity: 1, weightKg: 1 }
  ]);

  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ניקוי כתובת ה-URL של התמונה בעת הסרת הקומפוננטה
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  // שליפת קטגוריות, אזורים ומיקום העסק.
  // תוקן: בעבר טוקן מהכתובת נשמר כטוקן התחברות.
  useEffect(() => {
    const token = localStorage.getItem('token');

    fetch('/api/suppliers/current', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => (res.ok ? ((await res.json()) as SupplierResponseDto) : null))
      .then((supplier) => {
        if (supplier && (supplier.latitude !== 0 || supplier.longitude !== 0)) {
          setSupplierLocation({ lat: supplier.latitude, lng: supplier.longitude });
        }
      })
      .catch(() => { /* נשארים עם מרכז האזור */ });

    fetch('/api/categories', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאה בטעינת קטגוריות: ${res.status}`);
        return res.json();
      })
      .then((raw: FoodCategoryResponseDto[]) => {
        if (!Array.isArray(raw)) throw new Error('השרת החזיר רשימת קטגוריות לא תקינה.');
        // api/categories מחזיר FoodCategoryResponseDto { id, categoryName, perishabilityFactor }
        const data: CategoryOption[] = raw.map((c) => ({ id: c.id, name: c.categoryName }));
        setAvailableCategories(data);
        if (data.length > 0) {
          setCategories((prev) =>
            prev.map((item, idx) =>
              idx === 0 && item.categoryId === '' ? { ...item, categoryId: data[0].id } : item
            )
          );
        }
      })
      .catch((err) => {
        console.error('שגיאה בטעינת קטגוריות:', err);
        setError('לא ניתן לטעון את הקטגוריות. נסו לרענן את הדף.');
      });

    fetch('/api/region')
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאה בטעינת אזורים: ${res.status}`);
        return res.json();
      })
      .then((data: RegionResponseDto[]) => {
        if (!Array.isArray(data)) throw new Error('השרת החזיר רשימת אזורים לא תקינה.');
        setAvailableRegions(data);
        if (data.length === 1) setRegionId(data[0].id);
      })
      .catch((err) => {
        console.error('שגיאה בטעינת אזורים:', err);
        setError('לא ניתן לטעון את רשימת האזורים. נסו לרענן את הדף.');
      });
  }, []);

  const handleAddCategoryLine = () => {
    setCategories((prev) => [
      ...prev,
      {
        categoryId: availableCategories[0]?.id ?? '',
        quantity: 1,
        weightKg: 1
      }
    ]);
  };

  const handleRemoveCategoryLine = (index: number) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (
    index: number,
    field: keyof DonationCategoryLineDto,
    value: number | ''
  ) => {
    setCategories((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('יש לבחור קובץ תמונה תקין.');
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError(null);
    setSuccessMessage(null);
    setImageFileName('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('יש להתחבר למערכת מחדש.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);

    try {
      const response = await fetch('/api/donations/analyze-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data: AnalyzeImageResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'שגיאה בניתוח התמונה מול השרת.');
      }

      // שומרים את שם הקובץ שהשרת החזיר
      if (data.image) setImageFileName(data.image);

      if (!data.aiParsedData) {
        setError(data.message || 'לא ניתן לנתח את התמונה. נא למלא ידנית.');
        return;
      }

      const parsedAi: AiParsedItem | AiParsedItem[] =
        typeof data.aiParsedData === 'string'
          ? JSON.parse(data.aiParsedData)
          : data.aiParsedData;

      // בדיקה האם ה-AI החזיר אובייקט שגיאה (למשל תמונה שאינה קשורה לאוכל)
      const itemsList: AiParsedItem[] = Array.isArray(parsedAi) ? parsedAi : [parsedAi];
      
      if (itemsList.length > 0 && itemsList[0].error) {
        setError(itemsList[0].error);
        return;
      }

      // שורות שה-AI לא נתן להן קטגוריה קיימת או כמות/משקל תקינים - מסמנים לבדיקה ידנית
      // במקום לבחור בשקט את הקטגוריה הראשונה או להשלים 1.
      let needsReview = false;

      const mappedCategories: DonationCategoryLineDto[] = itemsList.map((item: AiParsedItem) => {
        const parsedCategoryId = Number(item.categoryId);
        const categoryExists = availableCategories.some((c) => c.id === parsedCategoryId);
        const parsedQuantity = Number(item.quantity);
        const parsedWeightKg = Number(item.weightKg);
        const quantityValid = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
        const weightValid = Number.isFinite(parsedWeightKg) && parsedWeightKg > 0;

        if (!categoryExists || !quantityValid || !weightValid) {
          needsReview = true;
        }

        return {
          categoryId: categoryExists ? parsedCategoryId : '',
          quantity: quantityValid ? Math.round(parsedQuantity) : 1,
          weightKg: weightValid ? Math.round(parsedWeightKg * 10) / 10 : 1
        };
      });

      if (mappedCategories.length > 0) {
        setCategories(mappedCategories);
      }

      if (needsReview) {
        setError('חלק מהשדות לא זוהו בוודאות. נא לבחור קטגוריה ולבדוק כמות ומשקל בשורות המסומנות.');
      } else {
        setSuccessMessage('התמונה נותחה והנתונים שובצו בטופס. כדאי לעבור ולוודא שהכמויות נכונות.');
      }
    } catch (err) {
      console.error('שגיאה בניתוח התמונה:', err);
      setError(
        err instanceof SyntaxError
          ? 'התקבלו נתונים לא תקינים מניתוח התמונה. נא למלא ידנית.'
          : err instanceof Error
            ? err.message
            : 'שגיאת תקשורת בניתוח התמונה.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const token = localStorage.getItem('token');
    if (!token) {
      setError('יש להתחבר למערכת מחדש.');
      setLoading(false);
      return;
    }

    if (categories.length === 0) {
      setError('יש להוסיף לפחות מוצר אחד לתרומה.');
      setLoading(false);
      return;
    }

    if (regionId === '' || !selectedRegion) {
      setError('נא לבחור את אזור האיסוף.');
      setLoading(false);
      return;
    }

    for (const [index, cat] of categories.entries()) {
      const categoryExists = availableCategories.some((c) => c.id === cat.categoryId);
      if (
        cat.categoryId === '' ||
        !categoryExists ||
        !Number.isFinite(cat.quantity) ||
        cat.quantity <= 0 ||
        !Number.isFinite(cat.weightKg) ||
        cat.weightKg <= 0
      ) {
        setError(`נא לוודא שכל השדות במוצר ${index + 1} תקינים.`);
        setLoading(false);
        return;
      }
    }

    const formattedPickupTime =
      latestPickupTime.length === 5 ? `${latestPickupTime}:00` : latestPickupTime;

    // שעת התפוגה נשלחת כשעון מקומי של היום (בלי Z) - השרת מפרש אותה כשעון ישראל
    let expirationPayload: string | null = null;
    if (expirationTime) {
      if (expirationTime <= latestPickupTime) {
        setError('שעת התפוגה חייבת להיות אחרי שעת האיסוף האחרונה.');
        setLoading(false);
        return;
      }
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      expirationPayload = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${expirationTime}:00`;
    }

    const donationPayload = {
      regionId,
      latitude,
      longitude,
      googlePlaceId,
      latestPickupTime: formattedPickupTime,
      expirationTime: expirationPayload,
      image: imageFileName || null,
      categories: categories.map((c) => ({ categoryId: Number(c.categoryId), quantity: c.quantity, weightKg: c.weightKg }))
    };

    try {
      const response = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(donationPayload)
      });

      if (response.ok) {
        setSuccessMessage('התרומה נוצרה בהצלחה! מנוע השידוכים יחפש לה מתנדב ועמותה.');
      } else {
        const errData: ValidationProblemBody = await response.json().catch(() => ({}));
        let errorText = 'שגיאה בשמירת התרומה בשרת.';
        if (errData.errors) {
          errorText = Object.values(errData.errors).flat().join(', ');
        } else if (errData.message) {
          errorText = errData.message;
        }
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
        subtitle="מלאו את פרטי התרומה ידנית או צלמו תמונה למילוי אוטומטי."
      />

      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <form onSubmit={handleSubmit}>
          <FormSection title="מקום וזמן האיסוף" columns={1}>
            <TextField
              select
              label="אזור האיסוף"
              value={regionId}
              onChange={(e) => setRegionId(e.target.value === '' ? '' : Number(e.target.value))}
              helperText={
                availableRegions.length === 0
                  ? 'לא נמצאו אזורים במערכת. נא לפנות למנהל.'
                  : 'האזור שבו נמצא העסק. משמש לשיבוץ מתנדבים מהאזור.'
              }
              error={availableRegions.length === 0}
              required
            >
              {availableRegions.map((r) => (
                <MenuItem key={r.id} value={r.id}>
                  {r.regionName}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="שעת איסוף אחרונה"
              type="time"
              value={latestPickupTime}
              onChange={(e) => setLatestPickupTime(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true }
              }}
              helperText="השעה האחרונה שבה אפשר לאסוף את התרומה מהמקום."
              required
            />

            <TextField
              label="המזון טוב עד שעה (לא חובה)"
              type="time"
              value={expirationTime}
              onChange={(e) => setExpirationTime(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              helperText="בלי ערך - עד סוף היום. המנוע לא ישבץ מסלול שמגיע לעמותה אחרי השעה הזו."
            />
          </FormSection>

          <Box sx={{ mt: 3, mb: 3 }}>
            <Typography sx={{ fontWeight: 500, mb: 1.5 }}>
              תמונת התרומה (לניתוח אוטומטי)
            </Typography>

            <Button
              variant="outlined"
              component="label"
              startIcon={<PhotoCameraIcon />}
              sx={{ mb: 2 }}
            >
              צלם או בחר תמונה
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={handleImageChange}
              />
            </Button>

            {loading && (
              <Typography sx={{ color: 'primary.main', mb: 1 }}>
                מעבד נתונים, אנא המתן...
              </Typography>
            )}

            {imagePreview && (
              <Box
                sx={{
                  mt: 1,
                  maxWidth: 200,
                  borderRadius: 2,
                  overflow: 'hidden',
                  border: '1px solid #ddd'
                }}
              >
                <img
                  src={imagePreview}
                  alt="תצוגה מקדימה לתרומה"
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            )}
          </Box>

          <Typography
            sx={{
              mt: 4,
              mb: 2.5,
              fontSize: '0.7rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'primary.dark',
              fontWeight: 500
            }}
          >
            פרטי מוצרים בתרומה (מילוי ידני או אוטומטי)
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
                position: 'relative'
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 2
                }}
              >
                <Typography sx={{ fontWeight: 500 }}>
                  מוצר {index + 1}
                </Typography>

                {categories.length > 1 && (
                  <Tooltip title="הסר מוצר" arrow>
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveCategoryLine(index)}
                      aria-label="הסר מוצר"
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: '1fr',
                    md: 'repeat(3, 1fr)'
                  },
                  gap: 3
                }}
              >
                <TextField
                  select
                  label="בחר קטגוריה"
                  value={cat.categoryId}
                  error={cat.categoryId === ''}
                  helperText={cat.categoryId === '' ? 'יש לבחור קטגוריה' : undefined}
                  onChange={(e) =>
                    handleCategoryChange(
                      index,
                      'categoryId',
                      e.target.value === '' ? '' : Number(e.target.value)
                    )
                  }
                  required
                >
                  {availableCategories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="כמות יחידות"
                  type="number"
                  value={cat.quantity}
                  onChange={(e) =>
                    handleCategoryChange(
                      index,
                      'quantity',
                      e.target.value === '' ? 0 : Number(e.target.value)
                    )
                  }
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  error={!Number.isFinite(cat.quantity) || cat.quantity <= 0}
                  helperText={
                    !Number.isFinite(cat.quantity) || cat.quantity <= 0
                      ? 'יש להזין כמות גדולה מאפס'
                      : ' '
                  }
                />

                <TextField
                  label='משקל (ק"ג)'
                  type="number"
                  value={cat.weightKg}
                  onChange={(e) =>
                    handleCategoryChange(
                      index,
                      'weightKg',
                      e.target.value === '' ? 0 : Number(e.target.value)
                    )
                  }
                  slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                  error={!Number.isFinite(cat.weightKg) || cat.weightKg <= 0}
                  helperText={
                    !Number.isFinite(cat.weightKg) || cat.weightKg <= 0
                      ? 'יש להזין משקל גדול מאפס'
                      : ' '
                  }
                />
              </Box>
            </Box>
          ))}

          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddCategoryLine}
            sx={{ mt: 1 }}
          >
            הוסף סוג מוצר נוסף
          </Button>

          <Box sx={{ mt: 4 }}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'מעבד ושומר...' : 'פרסם תרומה חדשה'}
            </Button>
          </Box>
        </form>

        {error && <StatusAlert message={error} success={false} />}
        {successMessage && <StatusAlert message={successMessage} success />}
      </Card>
    </Box>
  );
}