import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const iconColors = {
  start: '#3b82f6',
  pickup: '#10b981',
  dropoff: '#ef4444',
  rest: '#f59e0b',
  fuel: '#8b5cf6',
  break: '#6b7280',
};

const stopEmoji = {
  start: '🚛',
  pickup: '📦',
  dropoff: '🏁',
  rest: '😴',
  fuel: '⛽',
  break: '☕',
};

function createIcon(type) {
  const color = iconColors[type] || '#3b82f6';
  const emoji = stopEmoji[type] || '📍';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:white;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:16px;
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [positions]);
  return null;
}

export default function RouteMap({ tripData }) {
  if (!tripData) return null;

  const { locations, stops, route_geometry } = tripData;

  // Build route polylines from OSRM geometry
  const route1 = (route_geometry?.to_pickup || []).map(([lon, lat]) => [lat, lon]);
  const route2 = (route_geometry?.to_dropoff || []).map(([lon, lat]) => [lat, lon]);
  const allRoutePoints = [...route1, ...route2];

  const center = [
    (locations.current.lat + locations.dropoff.lat) / 2,
    (locations.current.lon + locations.dropoff.lon) / 2,
  ];

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="map-container">
      <h3 className="section-title">🗺️ Route Map</h3>
      <MapContainer center={center} zoom={6} className="leaflet-map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route lines */}
        {route1.length > 0 && (
          <Polyline positions={route1} pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.8 }} />
        )}
        {route2.length > 0 && (
          <Polyline positions={route2} pathOptions={{ color: '#10b981', weight: 4, opacity: 0.8 }} />
        )}

        {/* Stops */}
        {stops.filter(s => s.lat && s.lon).map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lon]} icon={createIcon(stop.stop_type)}>
            <Popup>
              <div className="popup">
                <strong>{stopEmoji[stop.stop_type]} {stop.name}</strong>
                <div className="popup-type">{stop.stop_type.replace('_', ' ').toUpperCase()}</div>
                <div>⏰ Arrival: {formatTime(stop.arrival_time)}</div>
                <div>🚪 Departure: {formatTime(stop.departure_time)}</div>
                <div>⏱ Duration: {stop.duration_hrs.toFixed(1)} hrs</div>
                <div>📍 Mile: {Math.round(stop.odometer)}</div>
                {stop.notes && <div className="popup-notes">{stop.notes}</div>}
              </div>
            </Popup>
          </Marker>
        ))}

        {allRoutePoints.length > 0 && <FitBounds positions={allRoutePoints} />}
      </MapContainer>

      {/* Stop legend */}
      <div className="stop-list">
        {stops.map((stop, i) => (
          <div key={i} className={`stop-item stop-${stop.stop_type}`}>
            <span className="stop-emoji">{stopEmoji[stop.stop_type]}</span>
            <div className="stop-info">
              <strong>{stop.name}</strong>
              <span>{new Date(stop.arrival_time).toLocaleString('en-US', {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}</span>
            </div>
            <span className="stop-duration">{stop.duration_hrs.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </div>
  );
}
