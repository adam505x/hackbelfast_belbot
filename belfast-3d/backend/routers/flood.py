"""Proxy and cache for DfI NI flood data APIs."""

import httpx
from fastapi import APIRouter, Query

router = APIRouter()

DFI_BASE = "https://utility.arcgis.com/usrsvcs/servers"
FLOOD_SERVICES = {
    "fluvial_high": f"{DFI_BASE}/b02f4bb085ca4a489a38633b24a8f472/rest/services/DfIRivers/FluvialRiskHigh/MapServer/0",
    "apsfr": f"{DFI_BASE}/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/0",
    "tapsfr": f"{DFI_BASE}/f878cc67ac6640f7ba2ecec1fda3fd81/rest/services/DfIRivers/FloodsDirective2ndCycle/MapServer/1",
    "flooded_2017": "https://services1.arcgis.com/i8LHQZrSk9zIffRU/arcgis/rest/services/Flooded_Area_201708/FeatureServer/0",
}

NI_BBOX = "-8.2,54.0,-5.4,55.4"
BELFAST_BBOX = "-5.98,54.56,-5.84,54.64"

# Simple in-memory cache
_cache: dict[str, dict] = {}


async def query_arcgis(url: str, bbox: str = BELFAST_BBOX, max_records: int = 200) -> dict:
    """Query an ArcGIS MapServer/FeatureServer layer."""
    cache_key = f"{url}:{bbox}:{max_records}"
    if cache_key in _cache:
        return _cache[cache_key]

    params = {
        "where": "1=1",
        "geometry": bbox,
        "geometryType": "esriGeometryEnvelope",
        "inSR": "4326",
        "outSR": "4326",
        "outFields": "*",
        "f": "geojson",
        "resultRecordCount": str(max_records),
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(f"{url}/query", params=params)
        resp.raise_for_status()
        data = resp.json()

    _cache[cache_key] = data
    return data


@router.get("/layers")
async def list_flood_layers():
    """List available flood data layers."""
    return {"layers": list(FLOOD_SERVICES.keys())}


@router.get("/data/{layer_name}")
async def get_flood_data(
    layer_name: str,
    bbox: str = Query(default=NI_BBOX, description="Bounding box: minLng,minLat,maxLng,maxLat"),
    max_records: int = Query(default=500, le=2000),
):
    """Fetch flood data for a specific layer within a bounding box."""
    if layer_name not in FLOOD_SERVICES:
        return {"error": f"Unknown layer: {layer_name}", "available": list(FLOOD_SERVICES.keys())}

    try:
        data = await query_arcgis(FLOOD_SERVICES[layer_name], bbox, max_records)
        feature_count = len(data.get("features", []))
        return {
            "layer": layer_name,
            "feature_count": feature_count,
            "geojson": data,
        }
    except Exception as e:
        return {"error": str(e), "layer": layer_name}


@router.get("/all")
async def get_all_flood_data(
    bbox: str = Query(default=NI_BBOX),
):
    """Fetch all available flood layers for Belfast."""
    results = {}
    for name, url in FLOOD_SERVICES.items():
        try:
            data = await query_arcgis(url, bbox)
            results[name] = {
                "feature_count": len(data.get("features", [])),
                "geojson": data,
            }
        except Exception as e:
            results[name] = {"error": str(e)}
    return results
