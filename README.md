# 🚛 Spotter ELD — Trip Planner & Log Generator

A full-stack FMCSA-compliant ELD trip planning application built with Django + React.

## Features
- **Trip Planning** — Input current, pickup, and dropoff locations
- **HOS Compliance** — 70hr/8-day property carrier rules enforced automatically
- **Interactive Map** — Real routing via OpenStreetMap/OSRM (free, no API key needed)
- **ELD Log Sheets** — Auto-generated Driver's Daily Logs with visual grid

## HOS Rules Applied
- 11-hour driving limit per shift
- 14-hour duty window
- 10-hour consecutive off-duty between shifts
- 30-minute break after 8 cumulative driving hours
- Fuel stop at least every 1,000 miles
- 1 hour for pickup + 1 hour for dropoff

## Tech Stack
- **Backend**: Django 5 + Django REST Framework
- **Frontend**: React 18 + Vite + Leaflet.js
- **Routing**: OSRM (free, no API key required)
- **Geocoding**: Nominatim/OpenStreetMap (free)

## Local Development

### Backend
```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

## Deployment
- **Backend**: Render.com (free tier)
- **Frontend**: Vercel (free tier)

Set `VITE_API_URL` in Vercel to your Render backend URL.
