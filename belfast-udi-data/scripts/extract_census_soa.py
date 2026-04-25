#!/usr/bin/env python3
"""Extract Census 2001 and 2011 SOA-level population data for Belfast from the
attached NISRA spreadsheets, filter to Belfast SOAs (95GG*), and write clean CSVs."""

import pandas as pd
import os

RAW_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw')
CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')
BELFAST_PREFIX = '95GG'


def extract_2011():
    src = os.path.join(RAW_DIR, 'census-2011-ks101ni.xlsx')
    print(f"  Reading Census 2011 SOA sheet from {src}...")
    df = pd.read_excel(src, sheet_name='SOA', header=None)

    # Find the header row (contains 'SOA Code')
    header_idx = None
    for i in range(min(20, len(df))):
        row_str = ' '.join(str(v) for v in df.iloc[i].values)
        if 'SOA Code' in row_str or 'SOA_Code' in row_str:
            header_idx = i
            break

    if header_idx is None:
        # Try row with 'SOA' and 'All usual residents'
        for i in range(min(20, len(df))):
            row_str = ' '.join(str(v) for v in df.iloc[i].values)
            if 'All usual residents' in row_str:
                header_idx = i
                break

    if header_idx is None:
        print("  ERROR: Could not find header row in 2011 SOA sheet")
        return

    df.columns = [str(c).strip() for c in df.iloc[header_idx].values]
    df = df.iloc[header_idx + 1:].reset_index(drop=True)

    # Find the SOA code column
    code_col = None
    for c in df.columns:
        if 'code' in str(c).lower():
            code_col = c
            break
    if code_col is None:
        code_col = df.columns[1]  # Usually second column

    # Filter Belfast
    df[code_col] = df[code_col].astype(str).str.strip()
    belfast = df[df[code_col].str.startswith(BELFAST_PREFIX)].copy()

    # Clean column names
    belfast = belfast.rename(columns={
        df.columns[0]: 'SOA_NAME',
        code_col: 'SOA_CODE',
    })

    # Remove commas from numeric columns and coerce
    for col in belfast.columns:
        if col not in ('SOA_NAME', 'SOA_CODE'):
            belfast[col] = belfast[col].astype(str).str.replace(',', '').str.strip()
            belfast[col] = pd.to_numeric(belfast[col], errors='coerce')

    belfast['CENSUS_YEAR'] = 2011
    out = os.path.join(CLEAN_DIR, 'census_2011_belfast.csv')
    belfast.to_csv(out, index=False)
    print(f"  ✓ Census 2011: {len(belfast)} Belfast SOAs → {out}")


def extract_2001():
    src = os.path.join(RAW_DIR, 'census-2001-ks01.xlsx')
    print(f"  Reading Census 2001 SOA sheet from {src}...")
    df = pd.read_excel(src, sheet_name='SOA', header=None)

    # Find header row
    header_idx = None
    for i in range(min(20, len(df))):
        row_str = ' '.join(str(v) for v in df.iloc[i].values)
        if 'SOA Code' in row_str or 'All persons' in row_str:
            header_idx = i
            break

    if header_idx is None:
        print("  ERROR: Could not find header row in 2001 SOA sheet")
        return

    df.columns = [str(c).strip() for c in df.iloc[header_idx].values]
    df = df.iloc[header_idx + 1:].reset_index(drop=True)

    # Find SOA code column
    code_col = None
    for c in df.columns:
        if 'code' in str(c).lower():
            code_col = c
            break
    if code_col is None:
        code_col = df.columns[1]

    df[code_col] = df[code_col].astype(str).str.strip()
    belfast = df[df[code_col].str.startswith(BELFAST_PREFIX)].copy()

    belfast = belfast.rename(columns={
        df.columns[0]: 'SOA_NAME',
        code_col: 'SOA_CODE',
    })

    for col in belfast.columns:
        if col not in ('SOA_NAME', 'SOA_CODE'):
            belfast[col] = belfast[col].astype(str).str.replace(',', '').str.strip()
            belfast[col] = pd.to_numeric(belfast[col], errors='coerce')

    belfast['CENSUS_YEAR'] = 2001
    out = os.path.join(CLEAN_DIR, 'census_2001_belfast.csv')
    belfast.to_csv(out, index=False)
    print(f"  ✓ Census 2001: {len(belfast)} Belfast SOAs → {out}")


if __name__ == '__main__':
    os.makedirs(CLEAN_DIR, exist_ok=True)
    extract_2011()
    extract_2001()
