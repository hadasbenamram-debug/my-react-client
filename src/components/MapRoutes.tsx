import MapBasket from './MapBasket';
import {arcPath, pointAt} from '../utils/mapPaths';
import {MAP_ROUTES} from '../data';

interface MapRoutesProps {
    /** 0..1 - how much of each route is drawn */
    draw: number;
    /** ever-growing phase used to move the baskets along the routes */
    travel: number;
}

export default function MapRoutes({draw, travel}: MapRoutesProps) {
    return (
        <g>
            {MAP_ROUTES.map((route, index) => {
                const arc = arcPath(route.from, route.to, route.bow);
                const cycle = (travel + index * 0.17) % 1;
                const at = pointAt(route.from, arc.control, route.to, cycle * draw);
                return (
                    <g key={arc.d}>
                        <path className="map-route-ghost" d={arc.d} />
                        <path
                            className="map-route"
                            d={arc.d}
                            pathLength="1"
                            strokeDasharray={`${draw} 1`}
                        />
                        {draw > 0.05 ? <MapBasket x={at[0]} y={at[1]} /> : null}
                    </g>
                );
            })}
        </g>
    );
}
