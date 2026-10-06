import {MAP_OUTLINE, MAP_PLACES} from '../data.js';

export default function MapShape({reveal}) {
    return (
        <g>
            <path className="map-outline" d={MAP_OUTLINE} />
            {MAP_PLACES.map((place, index) => (
                <g
                    key={place.name}
                    className="map-place"
                    style={{opacity: Math.max(0, Math.min(1, reveal * 6 - index))}}
                >
                    <circle className="map-pin-ring" cx={place.x} cy={place.y} r="6" />
                    <circle className="map-pin" cx={place.x} cy={place.y} r="3.2" />
                    <text
                        className="map-label"
                        x={place.x + place.dx}
                        y={place.y + 3}
                        textAnchor={place.anchor}
                    >
                        {place.name}
                    </text>
                </g>
            ))}
        </g>
    );
}
