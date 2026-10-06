import {useEffect} from 'react';
import Contact from './Contact.jsx';

export default function ContactPage() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return <Contact />;
}
