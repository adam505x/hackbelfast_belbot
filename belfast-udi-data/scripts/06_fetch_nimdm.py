#!/usr/bin/env python3
"""Fetch NISRA NIMDM 2017 (NI Multiple Deprivation Measure) SOA ranks for Belfast."""

import os
import sys
import requests
import pandas as pd

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')

# NIMDM 2017 SOA-level results (same file used by 01_fetch_soa_boundaries)
NIMDM_SOA_URL = "https://www.nisra.gov.uk/files/nisra/publications/NIMDM17_SOAresults.xls"

RAW_FILE = os.path.join(RAW_DIR, 'nimdm2017_soa.xls')
CLEAN_FILE = os.path.join(CLEAN_DIR, 'nimdm_belfast.csv')


def fetch():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(CLEAN_DIR, exist_ok=True)

    if os.path.exists(RAW_FILE):
        print(f"  [cache] NIMDM 2017 SOA results")
    else:
        print(f"  Downloading NIMDM 2017 SOA results...")
        resp = requests.get(NIMDM_SOA_URL, timeout=120, allow_redirects=True)
        if resp.status_code != 200:
            print(f"  ERROR: HTTP {resp.status_code} from {NIMDM_SOA_URL}")
            sys.exit(1)
        with open(RAW_FILE, 'wb') as f:
            f.write(resp.content)
        print(f"  Saved ({len(resp.content) / 1024:.0f} KB)")

    # Parse the MDM sheet — it has all 890 SOAs with LGD names and domain ranks
    df = pd.read_excel(RAW_FILE, sheet_name='MDM')
    print(f"  Raw: {len(df)} SOAs across NI")

    # Filter to Belfast
    belfast = df[df['LGD2014NAME'] == 'Belfast'].copy()
    print(f"  Belfast: {len(belfast)} SOAs")

    # Rename columns to clean names
    col_map = {
        'SOA2001': 'SOA_CODE',
        'SOA2001_name': 'SOA_NAME',
        'LGD2014NAME': 'LGD_NAME',
        '2015 Default Urban/Rural ': 'URBAN_RURAL',
        'Multiple Deprivation Measure Rank \n(where 1 is most deprived)': 'MDM_RANK',
        'Income Domain Rank \n(where 1 is most deprived)': 'INCOME_RANK',
        'Employment Domain Rank (where 1 is most deprived)': 'EMPLOYMENT_RANK',
        'Health Deprivation and Disability Domain Rank (where 1 is most deprived)': 'HEALTH_RANK',
        'Education, Skills and Training Domain Rank (where 1 is most deprived)': 'EDUCATION_RANK',
        'Access to Services Domain Rank (where 1 is most deprived)': 'ACCESS_RANK',
        'Living Environment Domain Rank (where 1 is most deprived)': 'LIVING_ENV_RANK',
        'Crime and Disorder Domain Rank (where 1 is most deprived)': 'CRIME_RANK',
    }

    belfast = belfast.rename(columns={k: v for k, v in col_map.items() if k in belfast.columns})

    # Clean SOA names
    if 'SOA_NAME' in belfast.columns:
        belfast['SOA_NAME'] = belfast['SOA_NAME'].str.replace('_', ' ')

    # Coerce rank columns to numeric
    rank_cols = [c for c in belfast.columns if c.endswith('_RANK')]
    for col in rank_cols:
        belfast[col] = pd.to_numeric(belfast[col], errors='coerce')

    # Drop any unnamed columns
    belfast = belfast.loc[:, ~belfast.columns.str.startswith('Unnamed')]

    belfast = belfast.drop_duplicates(subset=['SOA_CODE'])
    belfast.to_csv(CLEAN_FILE, index=False)
    print(f"  ✓ NIMDM: {len(belfast)} Belfast SOAs with deprivation ranks → {CLEAN_FILE}")


if __name__ == '__main__':
    fetch()
