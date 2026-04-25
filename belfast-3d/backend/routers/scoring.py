"""Data Centre Opportunity Scoring Engine.

Composite score = weighted combination of:
  - Flood safety (0-1): inverse of flood risk at location
  - Grid proximity (0-1): distance to nearest substation, weighted by voltage
  - Fibre access (0-1): proximity to telecom infrastructure
  - Land availability (0-1): derelict/brownfield status
  - Deprivation bonus (0-1): higher score = more grant potential
"""

from fastapi import APIRouter
from pydantic import BaseModel
import numpy as np

router = APIRouter()

# Belfast substations (real NIE Networks / SONI locations)
SUBSTATIONS = [
    {"name": "Castlereagh 275kV", "lng": -5.8900, "lat": 54.5750, "voltage": 275},
    {"name": "Belfast North 110kV", "lng": -5.9400, "lat": 54.6100, "voltage": 110},
    {"name": "Belfast East 33kV", "lng": -5.9050, "lat": 54.5980, "voltage": 33},
    {"name": "Knock 33kV", "lng": -5.8700, "lat": 54.5850, "voltage": 33},
    {"name": "Falls Road 11kV", "lng": -5.9600, "lat": 54.5950, "voltage": 11},
    {"name": "Titanic Quarter 33kV", "lng": -5.9100, "lat": 54.6060, "voltage": 33},
    {"name": "Harbour 110kV", "lng": -5.9150, "lat": 54.6150, "voltage": 110},
    {"name": "Malone 33kV", "lng": -5.9450, "lat": 54.5800, "voltage": 33},
    {"name": "Dundonald 33kV", "lng": -5.8500, "lat": 54.5900, "voltage": 33},
]

# Flood zones (simplified centroids + radii)
FLOOD_ZONES = [
    {"lng": -5.9250, "lat": 54.5910, "radius": 0.005, "risk": 0.9},
    {"lng": -5.9280, "lat": 54.5990, "radius": 0.006, "risk": 0.85},
    {"lng": -5.9050, "lat": 54.6050, "radius": 0.008, "risk": 0.95},
    {"lng": -5.9200, "lat": 54.6130, "radius": 0.007, "risk": 0.9},
    {"lng": -5.9000, "lat": 54.5980, "radius": 0.005, "risk": 0.6},
    {"lng": -5.9480, "lat": 54.5970, "radius": 0.004, "risk": 0.5},
]

WEIGHTS = {
    "flood_safety": 0.30,
    "grid_proximity": 0.25,
    "fibre_access": 0.15,
    "land_availability": 0.15,
    "deprivation_bonus": 0.15,
}


def haversine_approx(lng1, lat1, lng2, lat2):
    """Quick approximate distance in km for nearby points."""
    dlat = (lat2 - lat1) * 111.32
    dlng = (lng2 - lng1) * 111.32 * np.cos(np.radians((lat1 + lat2) / 2))
    return np.sqrt(dlat**2 + dlng**2)


def calc_flood_safety(lng: float, lat: float) -> float:
    """1.0 = completely safe, 0.0 = high flood risk."""
    max_risk = 0.0
    for zone in FLOOD_ZONES:
        dist = haversine_approx(lng, lat, zone["lng"], zone["lat"])
        radius_km = zone["radius"] * 111.32
        if dist < radius_km:
            overlap = 1.0 - (dist / radius_km)
            max_risk = max(max_risk, zone["risk"] * overlap)
    return 1.0 - max_risk


def calc_grid_proximity(lng: float, lat: float) -> float:
    """Score based on distance to nearest substation, weighted by voltage."""
    best_score = 0.0
    for sub in SUBSTATIONS:
        dist = haversine_approx(lng, lat, sub["lng"], sub["lat"])
        voltage_weight = min(1.0, sub["voltage"] / 275)
        # Score decays with distance: 1.0 at 0km, ~0.1 at 5km
        proximity = np.exp(-dist / 1.5)
        score = proximity * (0.4 + 0.6 * voltage_weight)
        best_score = max(best_score, score)
    return best_score


def calc_fibre_access(lng: float, lat: float) -> float:
    """Estimate fibre proximity (city centre and harbour = best)."""
    city_centre = haversine_approx(lng, lat, -5.9301, 54.5973)
    harbour = haversine_approx(lng, lat, -5.9100, 54.6100)
    best_dist = min(city_centre, harbour)
    return np.exp(-best_dist / 2.0)


class SiteRequest(BaseModel):
    lng: float
    lat: float
    land_type: str = "unknown"
    deprivation_score: float = 0.0


class SiteScore(BaseModel):
    lng: float
    lat: float
    composite_score: float
    flood_safety: float
    grid_proximity: float
    fibre_access: float
    land_availability: float
    deprivation_bonus: float
    nearest_substation: str
    nearest_substation_voltage: int
    recommendation: str


class BatchRequest(BaseModel):
    sites: list[SiteRequest]


@router.post("/score", response_model=SiteScore)
async def score_site(site: SiteRequest):
    """Score a single candidate site across all intelligence layers."""
    flood = calc_flood_safety(site.lng, site.lat)
    grid = calc_grid_proximity(site.lng, site.lat)
    fibre = calc_fibre_access(site.lng, site.lat)

    land_scores = {"derelict": 0.9, "brownfield": 0.85, "industrial": 0.7, "greenfield": 0.3, "unknown": 0.5}
    land = land_scores.get(site.land_type, 0.5)

    dep_bonus = min(1.0, site.deprivation_score * 1.2)

    composite = (
        WEIGHTS["flood_safety"] * flood
        + WEIGHTS["grid_proximity"] * grid
        + WEIGHTS["fibre_access"] * fibre
        + WEIGHTS["land_availability"] * land
        + WEIGHTS["deprivation_bonus"] * dep_bonus
    )

    # Find nearest substation
    nearest = min(SUBSTATIONS, key=lambda s: haversine_approx(site.lng, site.lat, s["lng"], s["lat"]))

    if composite >= 0.8:
        rec = "Excellent site — strong across all factors"
    elif composite >= 0.6:
        rec = "Good potential — some factors need attention"
    elif composite >= 0.4:
        rec = "Moderate — significant constraints present"
    else:
        rec = "Poor suitability — major constraints"

    return SiteScore(
        lng=site.lng, lat=site.lat,
        composite_score=round(composite, 3),
        flood_safety=round(flood, 3),
        grid_proximity=round(grid, 3),
        fibre_access=round(fibre, 3),
        land_availability=round(land, 3),
        deprivation_bonus=round(dep_bonus, 3),
        nearest_substation=nearest["name"],
        nearest_substation_voltage=nearest["voltage"],
        recommendation=rec,
    )


@router.post("/batch", response_model=list[SiteScore])
async def score_batch(req: BatchRequest):
    """Score multiple candidate sites."""
    results = []
    for site in req.sites:
        result = await score_site(site)
        results.append(result)
    results.sort(key=lambda s: s.composite_score, reverse=True)
    return results
