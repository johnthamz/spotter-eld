import { useState } from 'react';
import TripForm from './components/TripForm';
import RouteMap from './components/RouteMap';
import ELDLogSheet from './components/ELDLogSheet';
import TripSummary from './components/TripSummary';
import { planTrip } from './api';
import './App.css';

export default function App() {
  const [tripData, setTripData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setTripData(null);
    try {
      const data = await planTrip(formData);
      setTripData(data);
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to plan trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🚛</span>
            <div>
              <h1>Spotter ELD</h1>
              <p>FMCSA-Compliant Trip Planner & Log Generator</p>
            </div>
          </div>
          <div className="header-badge">70hr/8-day • Property Carrier</div>
        </div>
      </header>

      {/* Main */}
      <main className="app-main">
        <TripForm onSubmit={handleSubmit} loading={loading} />

        {error && (
          <div className="error-box">
            ⚠️ {error}
          </div>
        )}

        {tripData && (
          <div id="results" className="results">
            <TripSummary summary={tripData.summary} locations={tripData.locations} />
            <RouteMap tripData={tripData} />
            <ELDLogSheet dailyLogs={tripData.daily_logs} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Built for Spotter AI Assessment • FMCSA HOS Compliance • 70hr/8-day Property Carrier</p>
      </footer>
    </div>
  );
}
