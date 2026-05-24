import { useState } from 'react';

const HOS_RULES = [
  '11-Hr Driving',
  '14-Hr Window',
  '30-Min Break',
  '70hr/8-Day',
  '34-Hr Restart',
];

/* Inline SVG icons — no external dependency */
function IconNavigation() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}

function IconPackage() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconMapPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function TripForm({ onSubmit, loading, loadingMsg }) {
  const [form, setForm] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    cycle_used_hrs: 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="trip-form">
      <div className="form-header">
        <div className="form-header-icon">🚛</div>
        <div>
          <h2>ELD Trip Planner</h2>
          <p>Enter trip details to generate your route and log sheets</p>
          <div className="form-rules">
            {HOS_RULES.map(rule => (
              <span key={rule} className="rule-chip">{rule}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label>
            <IconNavigation />
            Current Location
          </label>
          <input
            type="text"
            name="current_location"
            value={form.current_location}
            onChange={handleChange}
            placeholder="e.g. Chicago, IL"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>
            <IconPackage />
            Pickup Location
          </label>
          <input
            type="text"
            name="pickup_location"
            value={form.pickup_location}
            onChange={handleChange}
            placeholder="e.g. Indianapolis, IN"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>
            <IconMapPin />
            Dropoff Location
          </label>
          <input
            type="text"
            name="dropoff_location"
            value={form.dropoff_location}
            onChange={handleChange}
            placeholder="e.g. Nashville, TN"
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>
            <IconClock />
            Current Cycle Used (hrs)
          </label>
          <input
            type="number"
            name="cycle_used_hrs"
            value={form.cycle_used_hrs}
            onChange={handleChange}
            min="0"
            max="70"
            step="0.5"
            required
            disabled={loading}
          />
          <span className="hint">Hours used in current 70hr/8-day cycle (0–70)</span>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-plan">
        {loading ? (
          <span className="spinner-row">
            <span className="spinner" />
            {loadingMsg || 'Processing…'}
          </span>
        ) : (
          <span>Plan Trip &amp; Generate Logs</span>
        )}
      </button>
    </form>
  );
}
