import { Clock, MapPin, Fuel, AlertTriangle } from 'lucide-react';

export default function TripSummary({ summary, locations }) {
  if (!summary) return null;

  const hours = Math.floor(summary.total_trip_hrs);
  const mins = Math.round((summary.total_trip_hrs - hours) * 60);

  return (
    <div className="summary-card">
      <h3 className="section-title">📊 Trip Summary</h3>

      <div className="summary-grid">
        <div className="summary-stat">
          <MapPin size={20} className="stat-icon blue" />
          <div>
            <div className="stat-value">{summary.total_miles.toLocaleString()}</div>
            <div className="stat-label">Total Miles</div>
          </div>
        </div>

        <div className="summary-stat">
          <Clock size={20} className="stat-icon green" />
          <div>
            <div className="stat-value">{summary.total_drive_hrs.toFixed(1)}h</div>
            <div className="stat-label">Drive Time</div>
          </div>
        </div>

        <div className="summary-stat">
          <Clock size={20} className="stat-icon purple" />
          <div>
            <div className="stat-value">{hours}h {mins}m</div>
            <div className="stat-label">Total Trip Time</div>
          </div>
        </div>

        <div className="summary-stat">
          <Fuel size={20} className="stat-icon orange" />
          <div>
            <div className="stat-value">{summary.num_days}</div>
            <div className="stat-label">Days on Road</div>
          </div>
        </div>
      </div>

      {/* Route summary */}
      <div className="route-summary">
        <div className="route-point current">
          <span className="dot" />
          <span><strong>Start:</strong> {locations.current.name}</span>
        </div>
        <div className="route-line" />
        <div className="route-point pickup">
          <span className="dot" />
          <span><strong>Pickup:</strong> {locations.pickup.name}</span>
        </div>
        <div className="route-line" />
        <div className="route-point dropoff">
          <span className="dot" />
          <span><strong>Dropoff:</strong> {locations.dropoff.name}</span>
        </div>
      </div>

      {summary.warnings && summary.warnings.length > 0 && (
        <div className="warnings">
          {summary.warnings.map((w, i) => (
            <div key={i} className="warning-item">
              <AlertTriangle size={16} /> {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
