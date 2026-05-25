import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from datetime import datetime
from .hos_engine import plan_trip, TripPlan, DailyLog, Stop, LogEntry


def serialize_stop(s: Stop):
    return {
        "name": s.name,
        "stop_type": s.stop_type,
        "arrival_time": s.arrival_time.isoformat(),
        "departure_time": s.departure_time.isoformat(),
        "duration_hrs": round(s.duration_hrs, 2),
        "odometer": round(s.odometer, 1),
        "notes": s.notes,
        "lat": s.lat,
        "lon": s.lon,
    }


def serialize_log_entry(e: LogEntry):
    return {
        "status": e.status,
        "start_time": e.start_time.isoformat(),
        "end_time": e.end_time.isoformat(),
        "start_hour": e.start_time.hour + e.start_time.minute / 60,
        "end_hour": e.end_time.hour + e.end_time.minute / 60,
        "duration_hrs": round(e.duration_hrs, 4),
        "location": e.location,
    }


def serialize_daily_log(dl: DailyLog):
    totals = dl.total_hours
    return {
        "date": dl.date,
        "total_miles": dl.total_miles,
        "entries": [serialize_log_entry(e) for e in dl.entries],
        "totals": {k: round(v, 2) for k, v in totals.items()},
    }


def haversine_miles(lat1, lon1, lat2, lon2):
    """Straight-line distance fallback when OSRM unavailable."""
    import math
    R = 3958.8  # Earth radius in miles
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (math.sin(d_lat/2)**2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lon/2)**2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    # Multiply by 1.3 to approximate road distance
    return R * c * 1.3


def get_route(lat1, lon1, lat2, lon2):
    """
    Try OSRM for real road distance + geometry.
    Falls back to haversine if OSRM is unreachable.
    """
    try:
        url = (f"http://router.project-osrm.org/route/v1/driving/"
               f"{lon1},{lat1};{lon2},{lat2}")
        r = requests.get(url,
                         params={"overview": "full", "geometries": "geojson"},
                         timeout=8)
        if r.status_code == 200:
            data = r.json()
            if data.get("code") == "Ok":
                miles = data["routes"][0]["distance"] * 0.000621371
                geom = data["routes"][0]["geometry"]["coordinates"]
                return miles, geom
    except Exception:
        pass
    # Fallback: straight-line * 1.3
    miles = haversine_miles(lat1, lon1, lat2, lon2)
    # Simple 2-point geometry
    geom = [[lon1, lat1], [lon2, lat2]]
    return miles, geom


class PlanTripView(APIView):
    def post(self, request):
        data = request.data

        current_location  = data.get("current_location", "")
        pickup_location   = data.get("pickup_location", "")
        dropoff_location  = data.get("dropoff_location", "")
        cycle_used        = float(data.get("cycle_used_hrs", 0))

        # Coordinates sent from the frontend (after browser geocoding)
        curr_lat  = data.get("current_lat")
        curr_lon  = data.get("current_lon")
        pick_lat  = data.get("pickup_lat")
        pick_lon  = data.get("pickup_lon")
        drop_lat  = data.get("dropoff_lat")
        drop_lon  = data.get("dropoff_lon")

        if not all([current_location, pickup_location, dropoff_location]):
            return Response({"error": "All three locations are required."},
                            status=status.HTTP_400_BAD_REQUEST)

        if not all([curr_lat, curr_lon, pick_lat, pick_lon, drop_lat, drop_lon]):
            return Response(
                {"error": "Coordinates missing. Geocoding failed in browser."},
                status=status.HTTP_400_BAD_REQUEST)

        curr_lat, curr_lon = float(curr_lat), float(curr_lon)
        pick_lat, pick_lon = float(pick_lat), float(pick_lon)
        drop_lat, drop_lon = float(drop_lat), float(drop_lon)

        miles_to_pickup, route1_geom = get_route(curr_lat, curr_lon, pick_lat, pick_lon)
        miles_to_dropoff, route2_geom = get_route(pick_lat, pick_lon, drop_lat, drop_lon)

        trip = plan_trip(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            miles_to_pickup=miles_to_pickup,
            miles_pickup_to_dropoff=miles_to_dropoff,
            cycle_used_hrs=cycle_used,
            start_time=datetime.now().replace(minute=0, second=0, microsecond=0),
        )

        for stop in trip.stops:
            if stop.stop_type == "start":
                stop.lat, stop.lon = curr_lat, curr_lon
            elif stop.stop_type == "pickup":
                stop.lat, stop.lon = pick_lat, pick_lon
            elif stop.stop_type == "dropoff":
                stop.lat, stop.lon = drop_lat, drop_lon

        return Response({
            "summary": {
                "total_miles": round(trip.total_miles, 1),
                "total_drive_hrs": round(trip.total_drive_hrs, 2),
                "total_trip_hrs": round(trip.total_trip_hrs, 2),
                "num_days": len(trip.daily_logs),
                "warnings": trip.warnings,
            },
            "locations": {
                "current": {"name": current_location, "lat": curr_lat, "lon": curr_lon},
                "pickup":  {"name": pickup_location,  "lat": pick_lat, "lon": pick_lon},
                "dropoff": {"name": dropoff_location, "lat": drop_lat, "lon": drop_lon},
            },
            "route_geometry": {
                "to_pickup":  route1_geom,
                "to_dropoff": route2_geom,
            },
            "stops": [serialize_stop(s) for s in trip.stops],
            "daily_logs": [serialize_daily_log(dl) for dl in trip.daily_logs],
        })
