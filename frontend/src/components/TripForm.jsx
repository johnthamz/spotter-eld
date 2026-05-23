import { useState } from 'react';
import { MapPin, Navigation, Package, Clock, Truck } from 'lucide-react';

export default function TripForm({ onSubmit, loading }) {
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
        <Truck size={28} className="form-icon" />
        <div>
          <h2>ELD Trip Planner</h2>
          <p>Enter trip details to generate your route and log sheets</p>
        </div>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label><Navigation size={16} /> Current Location</label>
          <input
            type="text"
            name="current_location"
            value={form.current_location}
            onChange={handleChange}
            placeholder="e.g. Chicago, IL"
            required
          />
        </div>

        <div className="form-group">
          <label><Package size={16} /> Pickup Location</label>
          <input
            type="text"
            name="pickup_location"
            value={form.pickup_location}
            onChange={handleChange}
            placeholder="e.g. Indianapolis, IN"
            required
          />
        </div>

        <div className="form-group">
          <label><MapPin size={16} /> Dropoff Location</label>
          <input
            type="text"
            name="dropoff_location"
            value={form.dropoff_location}
            onChange={handleChange}
            placeholder="e.g. Nashville, TN"
            required
          />
        </div>

        <div className="form-group">
          <label><Clock size={16} /> Current Cycle Used (hrs)</label>
          <input
            type="number"
            name="cycle_used_hrs"
            value={form.cycle_used_hrs}
            onChange={handleChange}
            min="0"
            max="70"
            step="0.5"
            required
          />
          <span className="hint">Hours used in current 70hr/8-day cycle</span>
        </div>
      </div>

      <button type="submit" disabled={loading} className="btn-plan">
        {loading ? (
          <span className="spinner-row"><span className="spinner" /> Calculating Route…</span>
        ) : (
          <span>🗺️ Plan Trip & Generate Logs</span>
        )}
      </button>
    </form>
  );
}
