#!/usr/bin/env python3
"""Fetch NISRA SOA2011 boundary polygons (Shapefile) and filter to Belfast LGD.

Uses NIMDM 2017 SOA results to identify the 174 Belfast SOAs, then filters
the NI-wide shapefile to just those SOAs.
"""

import os
import sys
import requests
import geopandas as gpd
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')

# NISRA official SOA2011 Shapefile
SOA_SHP_URL = "https://www.nisra.gov.uk/files/nisra/publications/SOA2011_Esri_Shapefile_0.zip"

# NIMDM 2017 SOA results — has LGD2014NAME column for Belfast filtering
NIMDM_SOA_URL = "https://www.nisra.gov.uk/files/nisra/publications/NIMDM17_SOAresults.xls"

RAW_SHP_ZIP = os.path.join(RAW_DIR, 'soa2011_shapefile.zip')
RAW_NIMDM = os.path.join(RAW_DIR, 'nimdm2017_soa.xls')
CLEAN_FILE = os.path.join(CLEAN_DIR, 'soa_boundaries_belfast.geojson')


def download(url, dest, label):
    if os.path.exists(dest):
        print(f"  [cache] {label}")
        return True
    print(f"  Downloading {label}...")
    try:
        resp = requests.get(url, timeout=180, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  ERROR: {label} HTTP {resp.status_code} from {url}")
            return False
        with open(dest, 'wb') as f:
            f.write(resp.content)
        print(f"  Saved ({len(resp.content) / 1024:.0f} KB)")
        return True
    except Exception as e:
        print(f"  ERROR: {label}: {e}")
        return False


def fetch():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    # 1. Download shapefile
    if not download(SOA_SHP_URL, RAW_SHP_ZIP, "SOA2011 Shapefile"):
        sys.exit(1)

    # 2. Download NIMDM to get Belfast SOA codes
    if not download(NIMDM_SOA_URL, RAW_NIMDM, "NIMDM 2017 SOA results"):
        sys.exit(1)

    # 3. Extract Belfast SOA codes from NIMDM
    nimdm = pd.read_excel(RAW_NIMDM, sheet_name='MDM')
    belfast_soa_codes = set(
        nimdm[nimdm['LGD2014NAME'] == 'Belfast']['SOA2001'].astype(str).str.strip()
    )
    print(f"  NIMDM: {len(belfast_soa_codes)} Belfast SOA codes identified")

    # 4. Read shapefile and filter
    print("  Reading shapefile...")
    gdf = gpd.read_file(f"zip://{os.path.abspath(RAW_SHP_ZIP)}")
    print(f"  Raw: {len(gdf)} SOA polygons across NI")

    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print(f"  Reprojecting from {gdf.crs} to EPSG:4326...")
        gdf = gdf.to_crs(epsg=4326)

    belfast = gdf[gdf['SOA_CODE'].isin(belfast_soa_codes)].copy()
    print(f"  Belfast filter: {len(belfast)} SOAs (expected 174)")

    # Normalise columns
    belfast = belfast.rename(columns={'SOA_LABEL': 'SOA_NAME'})

    # Clean SOA names: "Shankill_1" → "Shankill 1"
    if 'SOA_NAME' in belfast.columns:
        belfast['SOA_NAME'] = belfast['SOA_NAME'].str.replace('_', ' ')

    # Validate geometries
    invalid_mask = ~belfast.geometry.is_valid
    if invalid_mask.any():
        print(f"  Fixing {invalid_mask.sum()} invalid geometries...")
        belfast.loc[invalid_mask, 'geometry'] = belfast.loc[invalid_mask, 'geometry'].buffer(0)

    belfast = belfast.drop_duplicates(subset=['SOA_CODE'])
    belfast.to_file(CLEAN_FILE, driver='GeoJSON')
    print(f"  ✓ SOA boundaries: {len(belfast)} Belfast SOAs → {CLEAN_FILE}")


if __name__ == '__main__':
    fetch()
