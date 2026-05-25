import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Geocode a location string using Nominatim via the browser.
 * Returns { lat, lon } or throws an error.
 */
export async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=us`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en' }
  });
  const data = await res.json();
  if (!data || data.length === 0) {
    // Try without US restriction
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data2 = await res2.json();
    if (!data2 || data2.length === 0) {
      throw new Error(`Could not find location: "${query}". Try adding the state or country.`);
    }
    return { lat: parseFloat(data2[0].lat), lon: parseFloat(data2[0].lon), display: data2[0].display_name };
  }
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), display: data[0].display_name };
}

/**
 * Geocode all three locations then call the Django API.
 */
export async function planTrip(formData) {
  // Step 1: Geocode in browser (no CORS issues)
  const [current, pickup, dropoff] = await Promise.all([
    geocodeLocation(formData.current_location),
    geocodeLocation(formData.pickup_location),
    geocodeLocation(formData.dropoff_location),
  ]);

  // Step 2: Send coordinates + form data to Django
  const payload = {
    current_location:  formData.current_location,
    pickup_location:   formData.pickup_location,
    dropoff_location:  formData.dropoff_location,
    cycle_used_hrs:    formData.cycle_used_hrs,
    current_lat:  current.lat,
    current_lon:  current.lon,
    pickup_lat:   pickup.lat,
    pickup_lon:   pickup.lon,
    dropoff_lat:  dropoff.lat,
    dropoff_lon:  dropoff.lon,
  };

  const response = await axios.post(`${BASE_URL}/api/trips/plan/`, payload);
  return response.data;
}
