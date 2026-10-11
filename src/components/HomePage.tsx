import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
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
import { SCENES } from '../data.js';

interface LocationState {
    scrollTo?: string;
    [key: string]: any;
}

export default function HomePage() {
    const location = useLocation();

    useEffect(() => {
        const state = location.state as LocationState;
        const id = state && state.scrollTo;
        if (!id) {
            return;
        }
        const node = document.getElementById(id);
        if (node) {
            node.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [location]);

    return (
        <>
            <HeartStage />
            <HeroCircle />
            <Hero />
            <MapScene />
            <GrowScene {...(SCENES.heart as any)}>
                <HeartShape />
            </GrowScene>
            <CarDrive />
            <GrowScene {...(SCENES.basket as any)}>
                <BasketShape />
            </GrowScene>
            <EyesScene />
            <Impact />
        </>
    );
}