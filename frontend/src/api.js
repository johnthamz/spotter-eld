import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const planTrip = async (formData) => {
  const response = await axios.post(`${BASE_URL}/api/trips/plan/`, formData);
  return response.data;
};
