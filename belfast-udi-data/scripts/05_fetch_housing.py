#!/usr/bin/env python3
"""Fetch NI house price data from LPS/DoF (NI House Price Index).

Note: HM Land Registry Price Paid only covers England & Wales, NOT Northern Ireland.
NI housing data comes from LPS (Land & Property Services) via the Department of Finance.
"""

import os
import sys
import requests
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')

# NI HPI detailed statistics (quarterly, LGD and ward level, 2005-present)
NI_HPI_URL = (
    "https://www.finance-ni.gov.uk/sites/default/files/2026-02/"
    "ni-house-price-index-detailed-statistics-quarter-4-2025.xlsx"
)

# Ward-level annual statistics
WARD_STATS_URL = (
    "https://www.finance-ni.gov.uk/publications/"
    "ni-house-price-index-annual-ward-and-local-government-district-statistics"
)

RAW_HPI = os.path.join(RAW_DIR, 'ni_hpi_detailed.xlsx')
CLEAN_FILE = os.path.join(CLEAN_DIR, 'housing_belfast.csv')


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


def fetch():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    if not download(NI_HPI_URL, RAW_HPI, "NI HPI detailed statistics"):
        print("  ERROR: Could not download NI House Price Index data")
        print(f"  URL: {NI_HPI_URL}")
        sys.exit(1)

    try:
        xl = pd.ExcelFile(RAW_HPI)
        print(f"  Sheets: {xl.sheet_names}")

        # Find Belfast-relevant sheets
        all_frames = []
        for sheet in xl.sheet_names:
            sn = sheet.lower()
            if 'belfast' in sn or 'lgd' in sn or 'ward' in sn or 'sale' in sn:
                df = pd.read_excel(RAW_HPI, sheet_name=sheet)
                print(f"  Sheet '{sheet}': {len(df)} rows, cols: {list(df.columns)[:5]}")
                # Tag with source sheet
                df['_source_sheet'] = sheet
                all_frames.append(df)

        if not all_frames:
            # Just read all sheets
            for sheet in xl.sheet_names:
                df = pd.read_excel(RAW_HPI, sheet_name=sheet)
                if len(df) > 5:
                    print(f"  Sheet '{sheet}': {len(df)} rows, cols: {list(df.columns)[:5]}")
                    df['_source_sheet'] = sheet
                    all_frames.append(df)

        if all_frames:
            combined = pd.concat(all_frames, ignore_index=True)
            combined.to_csv(CLEAN_FILE, index=False)
            print(f"  ✓ Housing: {len(combined)} rows from NI HPI → {CLEAN_FILE}")
        else:
            print("  ERROR: No usable data found in NI HPI spreadsheet")
            sys.exit(1)

    except Exception as e:
        print(f"  ERROR parsing NI HPI: {e}")
        sys.exit(1)


if __name__ == '__main__':
    fetch()
