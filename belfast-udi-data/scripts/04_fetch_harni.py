#!/usr/bin/env python3
"""Fetch Listed/Historic Buildings and heritage data for Belfast from DfC/HED."""

import os
import sys
import zipfile
import io
import requests
import geopandas as gpd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')

# DfC Historic Environment Division datasets
HISTORIC_BUILDINGS_URL = (
    "https://www.communities-ni.gov.uk/sites/default/files/2026-03/"
    "historic-buildings-record.zip"
)
INDUSTRIAL_HERITAGE_URL = (
    "https://www.communities-ni.gov.uk/sites/default/files/2026-03/"
    "industrial-heritage-record.zip"
)

BELFAST_BBOX = (-6.05, 54.53, -5.80, 54.67)

RAW_BUILDINGS_ZIP = os.path.join(RAW_DIR, 'historic-buildings-record.zip')
RAW_INDUSTRIAL_ZIP = os.path.join(RAW_DIR, 'industrial-heritage-record.zip')
CLEAN_BUILDINGS = os.path.join(CLEAN_DIR, 'listed_buildings_belfast.geojson')
CLEAN_HERITAGE = os.path.join(CLEAN_DIR, 'harni_belfast.geojson')


def download(url, dest, label):
    if os.path.exists(dest):
        print(f"  [cache] {label}")
        return True
    print(f"  Downloading {label}...")
    try:
        resp = requests.get(url, timeout=120, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  WARNING: {label} HTTP {resp.status_code} from {url}")
            return False
        with open(dest, 'wb') as f:
            f.write(resp.content)
        print(f"  Saved ({len(resp.content) / 1024:.0f} KB)")
        return True
    except Exception as e:
        print(f"  WARNING: {label}: {e}")
        return False


def read_from_zip(zip_path, label):
    """Read shapefile/geojson from a ZIP archive."""
    try:
        gdf = gpd.read_file(f"zip://{os.path.abspath(zip_path)}")
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)
        print(f"  {label}: {len(gdf)} features NI-wide")
        return gdf
    except Exception as e:
        # Try extracting and reading individual files
        print(f"  Could not read ZIP directly: {e}")
        try:
            extract_dir = zip_path.replace('.zip', '')
            os.makedirs(extract_dir, exist_ok=True)
            with zipfile.ZipFile(zip_path) as zf:
                zf.extractall(extract_dir)
            # Find shapefile or geojson
            for root, dirs, files in os.walk(extract_dir):
                for f in files:
                    if f.endswith('.shp') or f.endswith('.geojson'):
                        fpath = os.path.join(root, f)
                        gdf = gpd.read_file(fpath)
                        if gdf.crs and gdf.crs.to_epsg() != 4326:
                            gdf = gdf.to_crs(epsg=4326)
                        print(f"  {label}: {len(gdf)} features from {f}")
                        return gdf
        except Exception as e2:
            print(f"  ERROR reading {label}: {e2}")
    return None


def filter_belfast(gdf, label):
    minx, miny, maxx, maxy = BELFAST_BBOX
    belfast = gdf.cx[minx:maxx, miny:maxy].copy()
    print(f"  {label}: {len(gdf)} NI → {len(belfast)} Belfast")
    return belfast


def fetch():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    buildings_ok = False
    heritage_ok = False

    # Historic Buildings Record (listed buildings)
    if download(HISTORIC_BUILDINGS_URL, RAW_BUILDINGS_ZIP, "Historic Buildings Record"):
        gdf = read_from_zip(RAW_BUILDINGS_ZIP, "Historic Buildings")
        if gdf is not None and len(gdf) > 0:
            belfast = filter_belfast(gdf, "Historic Buildings")
            if len(belfast) > 0:
                belfast = belfast.drop_duplicates()
                belfast.to_file(CLEAN_BUILDINGS, driver='GeoJSON')
                print(f"  ✓ Listed Buildings: {len(belfast)} in Belfast → {CLEAN_BUILDINGS}")
                buildings_ok = True

    # Industrial Heritage Record (dereliction proxy)
    if download(INDUSTRIAL_HERITAGE_URL, RAW_INDUSTRIAL_ZIP, "Industrial Heritage Record"):
        gdf = read_from_zip(RAW_INDUSTRIAL_ZIP, "Industrial Heritage")
        if gdf is not None and len(gdf) > 0:
            belfast = filter_belfast(gdf, "Industrial Heritage")
            if len(belfast) > 0:
                belfast = belfast.drop_duplicates()
                belfast.to_file(CLEAN_HERITAGE, driver='GeoJSON')
                print(f"  ✓ Industrial Heritage: {len(belfast)} in Belfast → {CLEAN_HERITAGE}")
                heritage_ok = True

    if not buildings_ok and not heritage_ok:
        print("  ERROR: No heritage data obtained")
        sys.exit(1)

    if not buildings_ok:
        print("  ⚠️  Listed buildings unavailable")
    if not heritage_ok:
        print("  ⚠️  Industrial heritage unavailable")


if __name__ == '__main__':
    fetch()
