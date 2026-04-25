#!/usr/bin/env python3
"""Fetch NISRA Census data for Belfast.

Census 2021: Uses Super Data Zone (SDZ) level from bulk download — SDZ is the
closest Census 2021 geography to SOA (850 SDZs vs 890 SOAs across NI).
Census 2011: Uses SOA-level data from NINIS/NISRA.
Census 2001: Ward-level only (SOAs didn't exist).
"""

import os
import sys
import zipfile
import io
import requests
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')

# Census 2021 Phase 1 bulk download (demography at DZ/SDZ/LGD level)
CENSUS_2021_URL = (
    "https://www.nisra.gov.uk/system/files/statistics/"
    "census-2021-main-statistics-for-northern-ireland-phase-1-all-tables.zip"
)

# DZ boundary shapefile — has SDZ→LGD mapping for Belfast filtering
DZ_BOUNDARY_URL = (
    "https://www.nisra.gov.uk/files/nisra/publications/"
    "geography-dz2021-esri-shapefile.zip"
)

# Census 2011 — NISRA Area Explorer has 2001+2011 at SOA level
AREA_EXPLORER_URL = (
    "https://explore.nisra.gov.uk/area-explorer-2011/"
    "Area_Explorer_Data.xlsx"
)

BELFAST_LGD = "N09000003"


def download(url, dest, label):
    if os.path.exists(dest):
        print(f"  [cache] {label}")
        return True
    print(f"  Downloading {label}...")
    try:
        resp = requests.get(url, timeout=300, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  WARNING: {label} HTTP {resp.status_code}")
            return False
        with open(dest, 'wb') as f:
            f.write(resp.content)
        print(f"  Saved ({len(resp.content) / 1024:.0f} KB)")
        return True
    except Exception as e:
        print(f"  WARNING: {label}: {e}")
        return False


def process_census_2021(raw_dir, clean_dir):
    """Extract SDZ-level population/age data from Census 2021 Phase 1 bulk ZIP."""
    zip_file = os.path.join(raw_dir, 'census_2021_phase1.zip')
    if not download(CENSUS_2021_URL, zip_file, "Census 2021 Phase 1"):
        return None

    try:
        with zipfile.ZipFile(zip_file) as zf:
            # ms-a09 = population by single year of age (largest, most detailed)
            # ms-a05 = age by 5-year bands (simpler)
            for target in ['census-2021-ms-a09.xlsx', 'census-2021-ms-a05.xlsx',
                           'census-2021-ms-a01.xlsx']:
                if target in zf.namelist():
                    data = zf.read(target)
                    break
            else:
                print("  WARNING: No age table found in 2021 ZIP")
                return None

        # Parse SDZ sheet — skip metadata rows (header is row 8)
        df = pd.read_excel(io.BytesIO(data), sheet_name='SDZ', header=8)
        print(f"  2021 SDZ raw: {len(df)} rows, cols: {list(df.columns)[:5]}")

        # Clean column names
        df.columns = [str(c).strip().replace('\n', ' ') for c in df.columns]

        # The SDZ sheet has all NI SDZs — we need to filter to Belfast
        # SDZ codes are N21xxxxxx — we need a lookup to LGD
        # Use the DZ boundary shapefile which has SDZ→LGD mapping
        belfast_sdz = get_belfast_sdz_codes(raw_dir)

        if belfast_sdz:
            geo_col = 'Geography code' if 'Geography code' in df.columns else df.columns[1]
            df[geo_col] = df[geo_col].astype(str).str.strip()
            belfast_df = df[df[geo_col].isin(belfast_sdz)].copy()
            print(f"  2021 Belfast SDZs: {len(belfast_df)} (of {len(belfast_sdz)} expected)")
        else:
            # Can't filter — save all and note it
            belfast_df = df
            print("  ⚠️  Could not filter to Belfast — saving all NI SDZs")

        out = os.path.join(clean_dir, 'census_2021_belfast.csv')
        belfast_df.to_csv(out, index=False)
        print(f"  ✓ Census 2021: {len(belfast_df)} SDZ rows → {out}")
        return out

    except Exception as e:
        print(f"  ERROR processing 2021 data: {e}")
        return None


def get_belfast_sdz_codes(raw_dir):
    """Get Belfast SDZ codes from DZ boundary shapefile."""
    import geopandas as gpd

    shp_zip = os.path.join(raw_dir, 'dz2021_shapefile.zip')
    if not download(DZ_BOUNDARY_URL, shp_zip, "DZ2021 boundaries"):
        return None

    try:
        gdf = gpd.read_file(f"zip://{os.path.abspath(shp_zip)}")
        # Find LGD column
        lgd_col = None
        sdz_col = None
        for c in gdf.columns:
            cu = c.upper()
            if 'LGD' in cu and 'CD' in cu:
                lgd_col = c
            if 'SDZ' in cu and 'CD' in cu:
                sdz_col = c

        if lgd_col and sdz_col:
            belfast_dz = gdf[gdf[lgd_col] == BELFAST_LGD]
            sdz_codes = set(belfast_dz[sdz_col].unique())
            print(f"  Belfast SDZ codes: {len(sdz_codes)} from DZ boundaries")
            return sdz_codes
        else:
            print(f"  WARNING: Could not find LGD/SDZ columns: {list(gdf.columns)}")
            return None
    except Exception as e:
        print(f"  WARNING: Could not read DZ boundaries: {e}")
        return None


def process_census_2011(raw_dir, clean_dir):
    """Get Census 2011 population data at SOA level."""
    # Try NISRA Area Explorer Excel
    xlsx_file = os.path.join(raw_dir, 'area_explorer_2011.xlsx')
    if download(AREA_EXPLORER_URL, xlsx_file, "Census Area Explorer 2011"):
        try:
            xl = pd.ExcelFile(xlsx_file)
            print(f"  Area Explorer sheets: {xl.sheet_names[:5]}")
            df = pd.read_excel(xlsx_file, sheet_name=0)
            if len(df) > 10:
                out = os.path.join(clean_dir, 'census_2011_belfast.csv')
                df.to_csv(out, index=False)
                print(f"  ✓ Census 2011 (Area Explorer): {len(df)} rows → {out}")
                return out
        except Exception as e:
            print(f"  Could not parse Area Explorer: {e}")

    # Fallback: try NISRA data portal
    api_url = "https://data.nisra.gov.uk/api/3/action/datastore_search?resource_id=census-2011-population&limit=5000"
    csv_file = os.path.join(raw_dir, 'census_2011_api.json')
    if download(api_url, csv_file, "Census 2011 API"):
        try:
            import json
            with open(csv_file) as f:
                data = json.load(f)
            if 'result' in data and 'records' in data['result']:
                df = pd.DataFrame(data['result']['records'])
                out = os.path.join(clean_dir, 'census_2011_belfast.csv')
                df.to_csv(out, index=False)
                print(f"  ✓ Census 2011 (API): {len(df)} rows → {out}")
                return out
        except Exception:
            pass

    # Last resort: extract from Census 2021 bulk download which may have 2011 comparisons
    print("  WARNING: Could not obtain standalone Census 2011 data")
    print("  Note: NIMDM 2017 contains 2011-era deprivation indicators as a proxy")
    return None


def process_census_2001(raw_dir, clean_dir):
    """Census 2001 — ward level only."""
    print("  Census 2001: SOAs did not exist — ward-level only expected")
    out = os.path.join(clean_dir, 'census_2001_wards.csv')
    if not os.path.exists(out):
        pd.DataFrame({
            'note': ['Census 2001 is ward-level only. SOAs were introduced for Census 2011.'],
            'status': ['Manual download may be needed from NISRA archives']
        }).to_csv(out, index=False)
    print("  ⚠️  Census 2001: ward-level placeholder created")
    return out


def fetch():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    r2021 = process_census_2021(RAW_DIR, CLEAN_DIR)
    r2011 = process_census_2011(RAW_DIR, CLEAN_DIR)
    r2001 = process_census_2001(RAW_DIR, CLEAN_DIR)

    found = sum(1 for r in [r2001, r2011, r2021] if r is not None)
    print(f"  Census summary: {found}/3 years obtained")


if __name__ == '__main__':
    fetch()
