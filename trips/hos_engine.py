"""
HOS (Hours of Service) Engine
Rules: Property-carrying, 70hrs/8-day cycle
- 11hr driving limit per day
- 14hr duty window
- 10hr consecutive off-duty between shifts
- 30min break after 8 cumulative driving hours
- Fuel stop at least every 1,000 miles
- 1hr pickup + 1hr dropoff
"""

from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timedelta
import math


DRIVING_LIMIT = 11.0          # hrs driving per shift
DUTY_WINDOW = 14.0            # hrs total duty window
OFF_DUTY_REQUIRED = 10.0      # hrs off between shifts
BREAK_AFTER_DRIVING = 8.0     # cumulative hrs before 30min break required
BREAK_DURATION = 0.5          # 30 min break
CYCLE_LIMIT = 70.0            # 70hr/8-day
PICKUP_DURATION = 1.0         # hr
DROPOFF_DURATION = 1.0        # hr
FUEL_INTERVAL_MILES = 1000.0  # miles between fuel stops
AVG_SPEED_MPH = 55.0          # average driving speed


@dataclass
class Stop:
    name: str
    stop_type: str        # 'pickup' | 'dropoff' | 'rest' | 'fuel' | 'break' | 'start'
    arrival_time: datetime
    departure_time: datetime
    duration_hrs: float
    odometer: float       # miles at this stop
    lat: Optional[float] = None
    lon: Optional[float] = None
    notes: str = ""


@dataclass
class LogEntry:
    """One row on the ELD grid for a time segment"""
    status: str           # 'off_duty' | 'sleeper' | 'driving' | 'on_duty'
    start_time: datetime
    end_time: datetime
    location: str = ""

    @property
    def duration_hrs(self):
        return (self.end_time - self.start_time).total_seconds() / 3600


@dataclass
class DailyLog:
    date: str             # YYYY-MM-DD
    entries: List[LogEntry] = field(default_factory=list)
    total_miles: float = 0.0
    driver_name: str = "Driver"
    carrier_name: str = "Carrier"
    start_location: str = ""
    end_location: str = ""

    @property
    def total_hours(self):
        totals = {'off_duty': 0, 'sleeper': 0, 'driving': 0, 'on_duty': 0}
        for e in self.entries:
            totals[e.status] = totals.get(e.status, 0) + e.duration_hrs
        return totals


@dataclass
class TripPlan:
    stops: List[Stop] = field(default_factory=list)
    daily_logs: List[DailyLog] = field(default_factory=list)
    total_miles: float = 0.0
    total_drive_hrs: float = 0.0
    total_trip_hrs: float = 0.0
    warnings: List[str] = field(default_factory=list)


def plan_trip(
    current_location: str,
    pickup_location: str,
    dropoff_location: str,
    miles_to_pickup: float,
    miles_pickup_to_dropoff: float,
    cycle_used_hrs: float,
    start_time: Optional[datetime] = None,
    waypoints: Optional[list] = None,
) -> TripPlan:
    """
    Main trip planning function.
    Returns TripPlan with all stops and daily ELD logs.
    """
    if start_time is None:
        start_time = datetime.now().replace(minute=0, second=0, microsecond=0)

    plan = TripPlan()
    total_miles = miles_to_pickup + miles_pickup_to_dropoff
    plan.total_miles = total_miles

    # State tracking
    current_time = start_time
    cycle_hours_remaining = CYCLE_LIMIT - cycle_used_hrs
    current_odometer = 0.0
    last_fuel_odometer = 0.0
    consecutive_off_duty = 0.0
    current_day_drive_hrs = 0.0
    current_day_duty_hrs = 0.0
    current_day_start = None  # when duty window opened today
    cumulative_drive_since_break = 0.0

    all_log_entries = []  # flat list of (datetime, status, location)
    stops = []

    # --- Helper: add log entry ---
    def log(status, start, end, location=""):
        all_log_entries.append(LogEntry(
            status=status,
            start_time=start,
            end_time=end,
            location=location
        ))

    # --- Helper: add stop ---
    def add_stop(name, stype, arrival, departure, duration, odo, notes=""):
        stops.append(Stop(
            name=name,
            stop_type=stype,
            arrival_time=arrival,
            departure_time=departure,
            duration_hrs=duration,
            odometer=odo,
            notes=notes
        ))

    # --- Helper: drive a segment ---
    def drive_segment(miles, from_loc, to_loc, odo):
        nonlocal current_time, current_day_drive_hrs, current_day_duty_hrs
        nonlocal cycle_hours_remaining, current_day_start, cumulative_drive_since_break
        nonlocal current_odometer, last_fuel_odometer

        remaining_miles = miles
        seg_odo = odo

        while remaining_miles > 0:
            # Start duty window if not started
            if current_day_start is None:
                current_day_start = current_time
                current_day_drive_hrs = 0.0
                current_day_duty_hrs = 0.0
                cumulative_drive_since_break = 0.0

            # How many hours can we drive right now?
            drive_hrs_available = min(
                DRIVING_LIMIT - current_day_drive_hrs,
                DUTY_WINDOW - current_day_duty_hrs,
                cycle_hours_remaining,
                BREAK_AFTER_DRIVING - cumulative_drive_since_break  # until break needed
            )

            if drive_hrs_available <= 0.001:
                # Need a break or new day
                if cumulative_drive_since_break >= BREAK_AFTER_DRIVING - 0.001:
                    # 30-min break
                    brk_start = current_time
                    brk_end = current_time + timedelta(hours=BREAK_DURATION)
                    log('on_duty', brk_start, brk_end, from_loc)
                    current_time = brk_end
                    current_day_duty_hrs += BREAK_DURATION
                    cumulative_drive_since_break = 0.0
                    add_stop("Rest Break", "break", brk_start, brk_end, BREAK_DURATION, seg_odo,
                             "30-min mandatory break")
                    continue

                # Need full off-duty reset
                off_start = current_time
                off_end = current_time + timedelta(hours=OFF_DUTY_REQUIRED)
                log('off_duty', off_start, off_end, from_loc)
                current_time = off_end
                add_stop("Off Duty / Rest", "rest", off_start, off_end, OFF_DUTY_REQUIRED,
                         seg_odo, "10hr mandatory off-duty")
                # Reset daily counters
                current_day_drive_hrs = 0.0
                current_day_duty_hrs = 0.0
                current_day_start = None
                cumulative_drive_since_break = 0.0
                continue

            # Check fuel
            miles_since_fuel = seg_odo - last_fuel_odometer
            miles_until_fuel = FUEL_INTERVAL_MILES - miles_since_fuel
            if miles_until_fuel <= 0:
                # Fuel now
                fuel_start = current_time
                fuel_end = current_time + timedelta(hours=0.5)
                log('on_duty', fuel_start, fuel_end, from_loc)
                current_time = fuel_end
                current_day_duty_hrs += 0.5
                last_fuel_odometer = seg_odo
                add_stop("Fuel Stop", "fuel", fuel_start, fuel_end, 0.5, seg_odo,
                         "Fuel stop (1,000mi interval)")
                continue

            # How far can we drive before needing fuel?
            miles_to_fuel = min(miles_until_fuel, remaining_miles)
            # How far can we drive in available hours?
            miles_in_time = drive_hrs_available * AVG_SPEED_MPH
            # Drive the minimum of all constraints
            drive_miles = min(remaining_miles, miles_in_time, miles_to_fuel)
            drive_hrs = drive_miles / AVG_SPEED_MPH

            seg_start = current_time
            seg_end = current_time + timedelta(hours=drive_hrs)
            log('driving', seg_start, seg_end, f"{from_loc} → {to_loc}")

            current_time = seg_end
            current_day_drive_hrs += drive_hrs
            current_day_duty_hrs += drive_hrs
            cycle_hours_remaining -= drive_hrs
            cumulative_drive_since_break += drive_hrs
            seg_odo += drive_miles
            remaining_miles -= drive_miles

            if cycle_hours_remaining <= 0:
                plan.warnings.append("⚠️ Cycle limit reached. 34-hr restart required.")
                break

        return seg_odo

    # =====================
    # EXECUTE THE TRIP
    # =====================

    # 1. Drive from current → pickup
    add_stop(current_location, "start", current_time, current_time, 0, 0, "Trip start")
    log('on_duty', current_time, current_time, current_location)

    current_odometer = drive_segment(miles_to_pickup, current_location, pickup_location, 0)

    # 2. Pickup (1hr on-duty not driving)
    if current_day_start is None:
        current_day_start = current_time
    pickup_start = current_time
    pickup_end = current_time + timedelta(hours=PICKUP_DURATION)
    log('on_duty', pickup_start, pickup_end, pickup_location)
    current_time = pickup_end
    current_day_duty_hrs += PICKUP_DURATION
    add_stop(pickup_location, "pickup", pickup_start, pickup_end, PICKUP_DURATION,
             current_odometer, "Pickup — 1hr on-duty")

    # 3. Drive pickup → dropoff
    current_odometer = drive_segment(
        miles_pickup_to_dropoff, pickup_location, dropoff_location, current_odometer
    )

    # 4. Dropoff (1hr on-duty not driving)
    dropoff_start = current_time
    dropoff_end = current_time + timedelta(hours=DROPOFF_DURATION)
    log('on_duty', dropoff_start, dropoff_end, dropoff_location)
    current_time = dropoff_end
    add_stop(dropoff_location, "dropoff", dropoff_start, dropoff_end, DROPOFF_DURATION,
             current_odometer, "Dropoff — 1hr on-duty")

    plan.stops = stops
    plan.total_drive_hrs = sum(
        e.duration_hrs for e in all_log_entries if e.status == 'driving'
    )
    plan.total_trip_hrs = (current_time - start_time).total_seconds() / 3600

    # =====================
    # BUILD DAILY LOGS
    # =====================
    plan.daily_logs = build_daily_logs(all_log_entries, start_time, current_time, total_miles)

    return plan


def build_daily_logs(entries: List[LogEntry], trip_start: datetime,
                     trip_end: datetime, total_miles: float) -> List[DailyLog]:
    """
    Split flat log entries into per-day DailyLog objects.
    """
    if not entries:
        return []

    daily_logs = []
    current_date = trip_start.date()
    end_date = trip_end.date()

    while current_date <= end_date:
        day_start = datetime.combine(current_date, datetime.min.time())
        day_end = day_start + timedelta(days=1)

        day_entries = []
        day_miles = 0.0

        for entry in entries:
            # Clip entry to this day
            seg_start = max(entry.start_time, day_start)
            seg_end = min(entry.end_time, day_end)
            if seg_start >= seg_end:
                continue
            day_entries.append(LogEntry(
                status=entry.status,
                start_time=seg_start,
                end_time=seg_end,
                location=entry.location
            ))
            if entry.status == 'driving':
                hrs = (seg_end - seg_start).total_seconds() / 3600
                day_miles += hrs * AVG_SPEED_MPH

        if day_entries:
            # Fill any gaps with off_duty
            day_entries = fill_gaps(day_entries, day_start, day_end)

            log_obj = DailyLog(
                date=str(current_date),
                entries=day_entries,
                total_miles=round(day_miles),
            )
            daily_logs.append(log_obj)

        current_date += timedelta(days=1)

    return daily_logs


def fill_gaps(entries: List[LogEntry], day_start: datetime,
              day_end: datetime) -> List[LogEntry]:
    """Fill gaps in a day's entries with off_duty."""
    if not entries:
        return [LogEntry('off_duty', day_start, day_end)]

    filled = []
    entries = sorted(entries, key=lambda e: e.start_time)

    # Gap at start of day
    if entries[0].start_time > day_start:
        filled.append(LogEntry('off_duty', day_start, entries[0].start_time))

    for i, entry in enumerate(entries):
        filled.append(entry)
        if i + 1 < len(entries):
            gap_start = entry.end_time
            gap_end = entries[i + 1].start_time
            if gap_end > gap_start:
                filled.append(LogEntry('off_duty', gap_start, gap_end))

    # Gap at end of day
    if entries[-1].end_time < day_end:
        filled.append(LogEntry('off_duty', entries[-1].end_time, day_end))

    return filled
