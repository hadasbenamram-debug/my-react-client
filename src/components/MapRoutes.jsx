import MapBasket from './MapBasket.jsx';
import {arcPath, pointAt} from '../utils/mapPaths.js';
import {MAP_ROUTES} from '../data.js';

export default function MapRoutes({draw, travel}) {
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
