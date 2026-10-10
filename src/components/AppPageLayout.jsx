import {Outlet} from 'react-router-dom';
import Container from '@mui/material/Container';

// עטיפה משותפת לכל דפי /app/... : רווח מתחת ל-Header הקבוע + רוחב אחיד
export default function AppPageLayout() {
    return (
        <Container maxWidth="lg" sx={{pt: {xs: 12, md: 15}, pb: 8, minHeight: 'calc(100vh - 6rem)'}}>
            <Outlet />
        </Container>
    );
}
