import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STOP_COLORS = {
  start:   '#3b82f6',
  pickup:  '#22c55e',
  dropoff: '#f59e0b',
  rest:    '#a855f7',
  fuel:    '#14b8a6',
  break:   '#475569',
};

const STOP_EMOJI = {
  start:   '🚛',
  pickup:  '📦',
  dropoff: '🏁',
  rest:    '😴',
  fuel:    '⛽',
  break:   '☕',
};

function createIcon(type) {
  const color = STOP_COLORS[type] || '#3b82f6';
  const emoji = STOP_EMOJI[type]  || '📍';
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      color:#fff;
      border-radius:50%;
      width:32px;height:32px;
      display:flex;align-items:center;justify-content:center;
      font-size:15px;
      border:2px solid rgba(255,255,255,0.9);
      box-shadow:0 2px 8px rgba(0,0,0,0.5),0 0 0 3px ${color}44;
    ">${emoji}</div>`,
    iconSize:   [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions?.length > 1) map.fitBounds(positions, { padding: [48, 48] });
  }, [positions]);
  return null;
}

const fmt = (iso) =>
  new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

export default function RouteMap({ tripData }) {
  if (!tripData) return null;

  const { locations, stops, route_geometry } = tripData;

  const route1 = (route_geometry?.to_pickup  || []).map(([lon, lat]) => [lat, lon]);
  const route2 = (route_geometry?.to_dropoff || []).map(([lon, lat]) => [lat, lon]);
  const allRoutePoints = [...route1, ...route2];

  const center = [
    (locations.current.lat + locations.dropoff.lat) / 2,
    (locations.current.lon + locations.dropoff.lon) / 2,
  ];

  return (
    <div className="map-container">
      <div className="section-label">Navigation</div>
      <h3 className="section-title">Route Map</h3>

      <div className="map-body">
        <MapContainer center={center} zoom={6} className="leaflet-map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {route1.length > 0 && (
            <Polyline positions={route1}
              pathOptions={{ color: '#3b82f6', weight: 4, opacity: 0.85 }} />
          )}
          {route2.length > 0 && (
            <Polyline positions={route2}
              pathOptions={{ color: '#22c55e', weight: 4, opacity: 0.85 }} />
          )}

          {stops.filter(s => s.lat && s.lon).map((stop, i) => (
            <Marker key={i} position={[stop.lat, stop.lon]} icon={createIcon(stop.stop_type)}>
              <Popup>
                <div className="popup">
                  <div className="popup-name">
                    {STOP_EMOJI[stop.stop_type]} {stop.name}
                  </div>
                  <span className="popup-badge">
                    {stop.stop_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="popup-row">⏰ <span>Arrival: {fmt(stop.arrival_time)}</span></div>
                  <div className="popup-row">🚪 <span>Departure: {fmt(stop.departure_time)}</span></div>
                  <div className="popup-row">⏱ <span>Duration: {stop.duration_hrs.toFixed(1)} hrs</span></div>
                  <div className="popup-row">📍 <span>Mile: {Math.round(stop.odometer)}</span></div>
                  {stop.notes && (
                    <div className="popup-notes">{stop.notes}</div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {allRoutePoints.length > 0 && <FitBounds positions={allRoutePoints} />}
        </MapContainer>

        <div className="stop-sidebar">
          {stops.map((stop, i) => (
            <div key={i} className="stop-card" data-type={stop.stop_type}>
              <div className="stop-card-emoji">{STOP_EMOJI[stop.stop_type]}</div>
              <div className="stop-card-info">
                <div className="stop-card-name">{stop.name}</div>
                <div className="stop-card-time">{fmt(stop.arrival_time)}</div>
              </div>
              <div className="stop-card-dur">{stop.duration_hrs.toFixed(1)}h</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
