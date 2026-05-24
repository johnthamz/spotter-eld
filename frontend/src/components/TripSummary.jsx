export default function TripSummary({ summary, locations }) {
  if (!summary) return null;

  const hours = Math.floor(summary.total_trip_hrs);
  const mins  = Math.round((summary.total_trip_hrs - hours) * 60);

  return (
    <div className="summary-card">
      <div className="section-label">Trip Overview</div>
      <h3 className="section-title">Trip Summary</h3>

      <div className="stats-row">
        <div className="stat-tile miles">
          <div className="stat-icon-wrap">🛣️</div>
          <div className="stat-value">{summary.total_miles.toLocaleString()}</div>
          <div className="stat-label">Total Miles</div>
        </div>

        <div className="stat-tile drive">
          <div className="stat-icon-wrap">🚛</div>
          <div className="stat-value">{summary.total_drive_hrs.toFixed(1)}h</div>
          <div className="stat-label">Drive Time</div>
        </div>

        <div className="stat-tile time">
          <div className="stat-icon-wrap">⏱️</div>
          <div className="stat-value">{hours}h {mins}m</div>
          <div className="stat-label">Total Trip Time</div>
        </div>

        <div className="stat-tile days">
          <div className="stat-icon-wrap">📅</div>
          <div className="stat-value">{summary.num_days}</div>
          <div className="stat-label">Days on Road</div>
        </div>
      </div>

      <div className="route-path">
        <div className="route-node start">
          <div className="route-node-dot" />
          <div>
            <div className="route-node-label">Start</div>
            <div className="route-node-name">{locations.current.name}</div>
          </div>
        </div>

        <div className="route-connector" />

        <div className="route-node pickup">
          <div className="route-node-dot" />
          <div>
            <div className="route-node-label">Pickup</div>
            <div className="route-node-name">{locations.pickup.name}</div>
          </div>
        </div>

        <div className="route-connector" />

        <div className="route-node dropoff">
          <div className="route-node-dot" />
          <div>
            <div className="route-node-label">Dropoff</div>
            <div className="route-node-name">{locations.dropoff.name}</div>
          </div>
        </div>
      </div>

      {summary.warnings?.length > 0 && (
        <div className="warnings">
          {summary.warnings.map((w, i) => (
            <div key={i} className="warning-item">⚠️ {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
