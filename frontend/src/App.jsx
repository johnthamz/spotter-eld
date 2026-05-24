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
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setTripData(null);

    try {
      setLoadingMsg('Geocoding locations…');
      await new Promise(r => setTimeout(r, 100));

      setLoadingMsg('Calculating route distances…');
      const data = await planTrip(formData);

      setLoadingMsg('Generating ELD log sheets…');
      await new Promise(r => setTimeout(r, 200));

      setTripData(data);
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      if (err.message && err.message.includes('Could not find location')) {
        setError(err.message);
      } else {
        setError(
          err.response?.data?.error ||
          err.message ||
          'Something went wrong. Please check your locations and try again.'
        );
      }
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-mark">🚛</div>
            <div className="logo-text">
              <h1>Spotter ELD</h1>
              <p>FMCSA-Compliant Trip Planner &amp; Log Generator</p>
            </div>
          </div>
          <div className="header-right">
            <div className="header-dot" />
            <div className="header-badge">70hr/8-day · Property Carrier</div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <TripForm onSubmit={handleSubmit} loading={loading} loadingMsg={loadingMsg} />

        {error && (
          <div className="error-box">⚠️ {error}</div>
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
        Built for Spotter AI Assessment · FMCSA HOS Compliance · 70hr/8-day Property Carrier
      </footer>
    </div>
  );
}
