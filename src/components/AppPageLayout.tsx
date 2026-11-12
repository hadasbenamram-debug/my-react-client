import {Outlet} from 'react-router-dom';
import Container from '@mui/material/Container';
import AssistantChat from './AssistantChat';
import {PendingOfferBanner} from './LiveUpdates';

// עטיפה משותפת לכל דפי /app/... : רווח מתחת ל-Header הקבוע + רוחב אחיד
// + העוזר החכם (כפתור צף). העטיפה נשארת במעבר בין מסכים, ולכן גם השיחה עם העוזר נשמרת.
export default function AppPageLayout() {
    return (
        <>
            <Container maxWidth="lg" sx={{pt: {xs: 12, md: 15}, pb: 8, minHeight: 'calc(100vh - 6rem)'}}>
                {/* תיקון 45: מתנדב - בקשת איסוף שממתינה לתשובה מוצגת בראש כל דף */}
                <PendingOfferBanner />
                <Outlet />
            </Container>
            <AssistantChat />
        </>
    );
}
