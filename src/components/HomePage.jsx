import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import Hero from './Hero.jsx';
import HeroCircle from './HeroCircle.jsx';
import HeartStage from './HeartStage.jsx';
import GrowScene from './GrowScene.jsx';
import HeartShape from './HeartShape.jsx';
import BasketShape from './BasketShape.jsx';
import MapScene from './MapScene.jsx';
import CarDrive from './CarDrive.jsx';
import EyesScene from './EyesScene.jsx';
import Impact from './Impact.jsx';
import {SCENES} from '../data.js';

export default function HomePage() {
    const location = useLocation();

    useEffect(() => {
        const id = location.state && location.state.scrollTo;
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
