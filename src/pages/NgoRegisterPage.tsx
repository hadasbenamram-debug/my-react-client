import React, { useState, ChangeEvent, FormEvent } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import PageTitle from '../components/PageTitle';
import { FormSection, StatusAlert } from '../components/FormParts';

interface NgoFormState {
    name: string;
    email: string;
    phone: string;
    ngoName: string;
    registrationNumber: string;
    address: string;
    dailyCapacity: number | string;
    latitude: number;
    longitude: number;
    regionId: number | string;
    receivesOnFriday: boolean;
    fridayOpenTime: string;
    fridayCloseTime: string;
    [key: string]: any;
}

const userFields = [
    { name: 'name', label: 'שם מלא' },
    { name: 'email', label: 'אימייל', type: 'email' },
    { name: 'phone', label: 'טלפון' },
];

const ngoFields = [
    { name: 'ngoName', label: 'שם העמותה' },
    { name: 'registrationNumber', label: 'מספר רישום (חברה/עמותה)' },
    { name: 'address', label: 'כתובת' },
    { name: 'dailyCapacity', label: 'קיבולת יומית (ק"ג)', type: 'number' },
    { name: 'regionId', label: 'מזהה אזור (Region ID)', type: 'number' },
];

export function NgoRegisterPage() {
    const [formData, setFormData] = useState<NgoFormState>({
        name: '',
        email: '',
        phone: '',
        ngoName: '',
        registrationNumber: '',
        address: '',
        dailyCapacity: 100,
        latitude: 32.0853,
        longitude: 34.7818,
        regionId: 1,
        receivesOnFriday: false,
        fridayOpenTime: '',
        fridayCloseTime: '',
    });

    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>('');

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type, checked } = target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value,
        });
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        fetch('/api/ngos/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...formData,
                dailyCapacity: Number(formData.dailyCapacity),
                regionId: Number(formData.regionId),
                fridayOpenTime: formData.fridayOpenTime ? formData.fridayOpenTime + ':00' : null,
                fridayCloseTime: formData.fridayCloseTime ? formData.fridayCloseTime + ':00' : null,
            }),
        })
            .then(async (res) => {
                setLoading(false);
                if (res.ok) {
                    setMessage('רישום העמותה בוצע בהצלחה! סיסמה זמנית נשלחה למייל.');
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    setMessage(errorData.message || 'אירעה שגיאה בעת הרישום. נסה שוב.');
                }
            })
            .catch((err) => {
                setLoading(false);
                setMessage('שגיאת תקשורת מול השרת.');
                console.error('שגיאת תקשורת:', err);
            });
    };

    const renderField = (f: { name: string; label: string; type?: string }) => (
        <TextField
            key={f.name}
            name={f.name}
            label={f.label}
            type={f.type || 'text'}
            value={formData[f.name]}
            onChange={handleChange}
            required
        />
    );

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto' }}>
            <PageTitle
                eyebrow="הצטרפות"
                title="הרשמת עמותה חדשה"
                subtitle="עמותות ומוסדות שמקבלים תרומות מזון."
            />
            <Card sx={{ p: { xs: 3, md: 5 } }}>
                <form onSubmit={handleSubmit}>
                    <FormSection title="פרטי משתמש">{userFields.map(renderField)}</FormSection>
                    <Divider sx={{ my: 4 }} />
                    <FormSection title="פרטי העמותה">{ngoFields.map(renderField)}</FormSection>

                    <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 4 }}>
                        {loading ? 'שולח לאישור...' : 'הירשם כעמותה'}
                    </Button>
                </form>
                <StatusAlert message={message} />
            </Card>
        </Box>
    );
}