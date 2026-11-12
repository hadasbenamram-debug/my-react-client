import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';
import type { DonationResponseDto, FoodCategoryResponseDto, ImageAnalysisResponseDto, SupplierResponseDto, ValidationProblemBody } from '../types/api';
import { getToken } from '../utils/auth';

interface DonationCategoryLineDto {
  categoryId: number | '';
  quantity: number;
  weightKg: number;
}

interface CategoryOption {
  id: number;
  name: string;
}

// "HH:mm" -> דקות מתחילת היום
const minutesOf = (value: string) => {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// ברירת מחדל ל"זמינה לאיסוף החל מ-": השעה העגולה שאחרי שעה מעכשיו (לפחות לא שעה שכבר עברה)
const defaultReadyTime = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  if (d.getDate() !== new Date().getDate()) return '23:00';
  return `${String(d.getHours()).padStart(2, '0')}:00`;
};

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
  const navigate = useNavigate();
  // תוקן: אחרי פרסום מוצלח נשארו בטופס, ולחיצה נוספת על "פרסם" שלחה את אותה תרומה שוב
  // (עם תמונה שכבר נוצלה) - והשרת נכשל. עכשיו: שליחה אחת בלבד, ואחרי ההצלחה יוצאים מעמוד הפרסום.
  const submitting = useRef(false);
  // תיקון 33: מקום האיסוף הוא הכתובת של העסק מההרשמה - לא בוחרים אזור ולא מזינים כתובת.
  // השרת לוקח את המיקום המדויק של העסק (שנקבע לפי הכתובת, דרך Google Maps) וקובע לפיו את האזור.
  // כאן רק מציגים לספק מאיזו כתובת ייאספו (GET api/suppliers/current).
  const [supplier, setSupplier] = useState<SupplierResponseDto | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const supplierHasLocation = !!supplier && (supplier.latitude !== 0 || supplier.longitude !== 0);

  const [latestPickupTime, setLatestPickupTime] = useState<string>('18:00');
  // תיקון 43: אפשר לפרסם תרומה גם לאותו יום החל משעה מסוימת (למשל אוכל שיהיה מוכן רק אחרי סגירת המטבח).
  // התרומה מתפרסמת עכשיו, והמנוע שולח מתנדב שיגיע רק מהשעה הזו.
  const [laterPickup, setLaterPickup] = useState(false);
  const [earliestPickupTime, setEarliestPickupTime] = useState<string>(defaultReadyTime);
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

  // שליפת קטגוריות ואזורים.
  // תוקן: בעבר טוקן מהכתובת נשמר כטוקן התחברות.
  useEffect(() => {
    const token = getToken();

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

    fetch('/api/suppliers/current', {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`שגיאה בטעינת פרטי העסק: ${res.status}`);
        return res.json();
      })
      .then((data: SupplierResponseDto) => setSupplier(data))
      .catch((err) => {
        console.error('שגיאה בטעינת פרטי העסק:', err);
        setSupplierError('לא הצלחנו להציג כרגע את כתובת העסק. התרומה תיאסף מהכתובת שנרשמה בהרשמה.');
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

    const token = getToken();
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
    // לחיצה כפולה מהירה (לפני שהכפתור הספיק להיות מושבת) לא שולחת את התרומה פעמיים
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    let published = false;

    const stop = (message: string) => {
      setError(message);
      setLoading(false);
      submitting.current = false;
    };

    const token = getToken();
    if (!token) {
      stop('יש להתחבר למערכת מחדש.');
      return;
    }

    if (categories.length === 0) {
      stop('יש להוסיף לפחות מוצר אחד לתרומה.');
      return;
    }

    // השרת בודק את זה שוב - כאן רק כדי לא לשלוח טופס שבוודאות ייכשל
    if (supplier && !supplierHasLocation) {
      stop('לכתובת העסק אין עדיין מיקום על המפה, ולכן לא ניתן ליצור תרומה. יש לפנות למנהל המערכת.');
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
        stop(`נא לוודא שכל השדות במוצר ${index + 1} תקינים.`);
        return;
      }
    }

    const formattedPickupTime =
      latestPickupTime.length === 5 ? `${latestPickupTime}:00` : latestPickupTime;

    // תיקון 43: חלון איסוף של לפחות חצי שעה (השרת בודק את זה שוב)
    let earliestPayload: string | null = null;
    if (laterPickup) {
      if (!earliestPickupTime) {
        stop('יש לבחור מאיזו שעה התרומה זמינה לאיסוף.');
        return;
      }
      if (minutesOf(earliestPickupTime) + 30 > minutesOf(latestPickupTime)) {
        stop('השעה "זמינה לאיסוף החל מ-" צריכה להיות לפחות 30 דקות לפני שעת האיסוף האחרונה.');
        return;
      }
      earliestPayload = earliestPickupTime.length === 5 ? `${earliestPickupTime}:00` : earliestPickupTime;
    }

    // שעת התפוגה נשלחת כשעון מקומי של היום (בלי Z) - השרת מפרש אותה כשעון ישראל
    let expirationPayload: string | null = null;
    if (expirationTime) {
      if (expirationTime <= latestPickupTime) {
        stop('שעת התפוגה חייבת להיות אחרי שעת האיסוף האחרונה.');
        return;
      }
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      expirationPayload = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${expirationTime}:00`;
    }

    // בלי מקום / אזור: השרת לוקח אותם מהכתובת של העסק
    const donationPayload = {
      latestPickupTime: formattedPickupTime,
      earliestPickupTime: earliestPayload,
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
        const created = (await response.json().catch(() => null)) as DonationResponseDto | null;
        published = true;
        // יוצאים מעמוד הפרסום (replace - כך שגם "חזרה" בדפדפן לא מחזירה לטופס המלא)
        // תיקון 63: מסך התרומה של הספק (פרטים / מעקב / שיחה) במקום "פרטי תרומה"
        navigate(created?.id ? `/app/supplier/donation/${created.id}` : '/app/supplier/open-donations', {
          replace: true,
          state: { justPublished: true },
        });
        return;
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
      if (!published) {
        submitting.current = false;
        setLoading(false);
      }
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
            {/* תיקון 33: הכתובת מההרשמה - רק לתצוגה, בלי הזנה ובלי בחירת אזור */}
            <Alert
              severity={supplier && !supplierHasLocation ? 'warning' : 'info'}
              icon={<PlaceOutlinedIcon fontSize="inherit" />}
            >
              <Typography sx={{ fontWeight: 500 }}>
                {supplier ? `האיסוף יתבצע מ${supplier.businessName}: ${supplier.address}` : supplierError ?? 'טוען את כתובת העסק...'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {supplier && !supplierHasLocation
                  ? 'לכתובת הזו אין עדיין מיקום על המפה, ולכן אי אפשר לשבץ אליה מתנדב. יש לפנות למנהל המערכת.'
                  : 'הכתובת נלקחת אוטומטית מהכתובת שהזנתם בהרשמה, ולפיה נקבע גם אזור השיבוץ. לשינוי הכתובת יש לפנות למנהל המערכת.'}
              </Typography>
            </Alert>

            {/* תיקון 43: תרומה לאותו יום שזמינה רק משעה מסוימת */}
            <Box>
              <FormControlLabel
                control={<Switch checked={laterPickup} onChange={(e) => {
                  setLaterPickup(e.target.checked);
                  // השעה המוצעת - לפי השעה עכשיו (ולא לפי מתי שהדף נטען)
                  if (e.target.checked) setEarliestPickupTime(defaultReadyTime());
                }} />}
                label="המזון יהיה מוכן לאיסוף רק משעה מסוימת היום"
              />
              {laterPickup && (
                <TextField
                  sx={{ mt: 1.5 }}
                  label="זמינה לאיסוף החל מ-"
                  type="time"
                  value={earliestPickupTime}
                  onChange={(e) => setEarliestPickupTime(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  helperText="התרומה מתפרסמת עכשיו, והמתנדב יגיע רק מהשעה הזו. לפחות חצי שעה לפני שעת האיסוף האחרונה."
                  required
                />
              )}
            </Box>

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