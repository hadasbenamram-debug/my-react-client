import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import Hero from './Hero';
import HeroCircle from './HeroCircle';
import HeartStage from './HeartStage';
import GrowScene from './GrowScene';
import HeartShape from './HeartShape';
import BasketShape from './BasketShape';
import MapScene from './MapScene';
import CarDrive from './CarDrive';
import EyesScene from './EyesScene';
import Impact from './Impact';
import {SCENES} from '../data';

/** state שעמודים אחרים מעבירים ב-navigate('/', {state: {scrollTo: 'impact'}}) */
interface HomeLocationState {
    scrollTo?: string;
}

export default function HomePage() {
    const location = useLocation();
    const state = location.state as HomeLocationState | null;

    useEffect(() => {
        const id = state && state.scrollTo;
        if (!id) {
            return;
        }
        const node = document.getElementById(id);
        if (node) {
            node.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }, [location]);

    return (
        <>
            <HeartStage />
            <HeroCircle />
            <Hero />
            <MapScene />
            <GrowScene {...SCENES.heart}>
                <HeartShape />
            </GrowScene>
            <CarDrive />
            <GrowScene {...SCENES.basket}>
                <BasketShape />
            </GrowScene>
            <EyesScene />
            <Impact />
        </>
    );
}
