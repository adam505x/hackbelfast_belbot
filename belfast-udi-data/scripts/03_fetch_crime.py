#!/usr/bin/env python3
"""Process cached PSNI street-level crime data for Belfast."""

import os
import sys
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')
RAW_CRIME_DIR = os.path.join(RAW_DIR, 'crime')
CLEAN_FILE = os.path.join(CLEAN_DIR, 'crime_belfast.csv')


def fetch():
    os.makedirs(RAW_CRIME_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    # Process all cached months
    all_frames = []
    if not os.path.isdir(RAW_CRIME_DIR):
        print("  ERROR: No cached crime data in data/raw/crime/")
        sys.exit(1)

    months = sorted([
        d for d in os.listdir(RAW_CRIME_DIR)
        if os.path.isdir(os.path.join(RAW_CRIME_DIR, d))
    ])
    print(f"  Found {len(months)} cached months: {months[0]}..{months[-1]}" if months else "  No cached months")

    for ym in months:
        month_dir = os.path.join(RAW_CRIME_DIR, ym)
        csvs = [os.path.join(month_dir, f) for f in os.listdir(month_dir) if f.endswith('.csv')]
        for csv_path in csvs:
            try:
                df = pd.read_csv(csv_path)
                if 'Latitude' in df.columns and 'Longitude' in df.columns:
                    df = df.dropna(subset=['Latitude', 'Longitude'])
                    # Belfast bounding box
                    df = df[
                        (df['Latitude'] >= 54.53) & (df['Latitude'] <= 54.67) &
                        (df['Longitude'] >= -6.05) & (df['Longitude'] <= -5.80)
                    ]
                if len(df) > 0:
                    all_frames.append(df)
            except Exception:
                continue

    if not all_frames:
        print("  ERROR: No Belfast crime records found in cached data")
        sys.exit(1)

    combined = pd.concat(all_frames, ignore_index=True)
    combined = combined.drop_duplicates()
    if 'Month' in combined.columns:
        combined['Month'] = pd.to_datetime(combined['Month'], errors='coerce')
    for col in ['Latitude', 'Longitude']:
        if col in combined.columns:
            combined[col] = pd.to_numeric(combined[col], errors='coerce')
    combined = combined.dropna(subset=['Latitude', 'Longitude'])
    combined.to_csv(CLEAN_FILE, index=False)

    n_months = combined['Month'].nunique() if 'Month' in combined.columns else '?'
    date_range = ""
    if 'Month' in combined.columns:
        date_range = f", range {combined['Month'].min()} to {combined['Month'].max()}"
    print(f"  ✓ Crime: {len(combined)} records, {n_months} months{date_range} → {CLEAN_FILE}")


if __name__ == '__main__':
    fetch()
