import React, { useState, useEffect } from 'react';

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
    <div style={{ maxWidth: '600px', margin: 'auto', textAlign: 'right', direction: 'rtl', fontFamily: 'Arial', padding: '20px' }}>
      <h2>יצירת תרומה חדשה (ארגון תורם)</h2>

      {error && <div style={{ color: 'red', marginBottom: '15px', whiteSpace: 'pre-wrap' }}>{error}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold' }}>{successMessage}</div>}

      <form onSubmit={handleSubmit} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>שעת איסוף אחרונה (Latest Pickup Time):</label>
          <input 
            type="time" 
            value={latestPickupTime} 
            onChange={e => setLatestPickupTime(e.target.value)} 
            style={{ width: '100%', padding: '8px', fontSize: '16px' }} 
            required 
          />
        </div>

        <h3>פרטי מוצרים בתרומה</h3>
        {categories.map((cat, index) => (
          <div key={index} style={{ background: '#fff', padding: '10px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px' }}>
              <label>מזהה קטגוריה: </label>
              <input 
                type="number" 
                value={cat.categoryId} 
                onChange={e => handleCategoryChange(index, 'categoryId', Number(e.target.value))} 
                style={{ width: '100%', padding: '4px' }} 
              />
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label>כמות יחידות: </label>
              <input 
                type="number" 
                value={cat.quantity} 
                onChange={e => handleCategoryChange(index, 'quantity', Number(e.target.value))} 
                style={{ width: '100%', padding: '4px' }} 
              />
            </div>
            <div>
              <label>משקל (ק"ג): </label>
              <input 
                type="number" 
                step="any"
                value={cat.weightKg} 
                onChange={e => handleCategoryChange(index, 'weightKg', Number(e.target.value))} 
                style={{ width: '100%', padding: '4px' }} 
              />
            </div>
          </div>
        ))}

        <button type="button" onClick={handleAddCategoryLine} style={{ padding: '8px 12px', background: '#fbbc05', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}>
          + הוסף סוג מוצר נוסף
        </button>

        <div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#34a853', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {loading ? 'שומר במסד...' : 'פרסם תרומה חדשה'}
          </button>
        </div>
      </form>
    </div>
  );
}