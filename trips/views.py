import requests
import os
from django.conf import settings
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


def geocode(location: str):
    """Use Nominatim (free OpenStreetMap) to geocode a location."""
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": location, "format": "json", "limit": 1}
        headers = {"User-Agent": "SpotterELD/1.0"}
        r = requests.get(url, params=params, headers=headers, timeout=10)
        data = r.json()
        if data:
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception:
        pass
    return None, None


def get_route_distance(lat1, lon1, lat2, lon2):
    """Use OSRM free routing to get driving distance in miles."""
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}"
        params = {"overview": "full", "geometries": "geojson"}
        r = requests.get(url, params=params, timeout=15)
        data = r.json()
        if data.get("code") == "Ok":
            meters = data["routes"][0]["distance"]
            miles = meters * 0.000621371
            geometry = data["routes"][0]["geometry"]["coordinates"]
            return miles, geometry
    except Exception:
        pass
    return None, None


class PlanTripView(APIView):
    def post(self, request):
        data = request.data
        current_location = data.get("current_location", "")
        pickup_location = data.get("pickup_location", "")
        dropoff_location = data.get("dropoff_location", "")
        cycle_used = float(data.get("cycle_used_hrs", 0))

        if not all([current_location, pickup_location, dropoff_location]):
            return Response(
                {"error": "All three locations are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Geocode all three locations
        curr_lat, curr_lon = geocode(current_location)
        pick_lat, pick_lon = geocode(pickup_location)
        drop_lat, drop_lon = geocode(dropoff_location)

        if not all([curr_lat, pick_lat, drop_lat]):
            return Response(
                {"error": "Could not geocode one or more locations. Please be more specific."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get routing distances
        miles_to_pickup, route1_geom = get_route_distance(curr_lat, curr_lon, pick_lat, pick_lon)
        miles_pickup_dropoff, route2_geom = get_route_distance(pick_lat, pick_lon, drop_lat, drop_lon)

        if not miles_to_pickup or not miles_pickup_dropoff:
            return Response(
                {"error": "Could not calculate route distances."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Plan the trip
        trip = plan_trip(
            current_location=current_location,
            pickup_location=pickup_location,
            dropoff_location=dropoff_location,
            miles_to_pickup=miles_to_pickup,
            miles_pickup_to_dropoff=miles_pickup_dropoff,
            cycle_used_hrs=cycle_used,
            start_time=datetime.now().replace(minute=0, second=0, microsecond=0),
        )

        # Attach coords to key stops
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
                "pickup": {"name": pickup_location, "lat": pick_lat, "lon": pick_lon},
                "dropoff": {"name": dropoff_location, "lat": drop_lat, "lon": drop_lon},
            },
            "route_geometry": {
                "to_pickup": route1_geom,
                "to_dropoff": route2_geom,
            },
            "stops": [serialize_stop(s) for s in trip.stops],
            "daily_logs": [serialize_daily_log(dl) for dl in trip.daily_logs],
        })
