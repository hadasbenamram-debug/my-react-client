interface MapBasketProps {
    x: number;
    y: number;
}

export default function MapBasket({x, y}: MapBasketProps) {
    return (
        <g className="map-basket" transform={`translate(${x} ${y})`}>
            <path
                className="map-basket-handle"
                d="M-2.8 -0.8a2.8 2.8 0 0 1 5.6 0"
            />
            <path
                className="map-basket-body"
                d="M-4.2 -0.6h8.4l-1 5a1 1 0 0 1-1 .8h-4.4a1 1 0 0 1-1-.8Z"
            />
        </g>
    );
}
