#!/usr/bin/env python3
"""Check data sufficiency across all sources and write SUFFICIENCY.md report."""

import os
import json
import csv
from datetime import datetime

CLEAN_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')
REPORT_FILE = os.path.join(os.path.dirname(__file__), '..', 'SUFFICIENCY.md')

EXPECTED_SOAS = 174  # approximate Belfast SOA count


def count_csv_rows(path):
    if not os.path.exists(path):
        return 0
    with open(path, 'r') as f:
        return sum(1 for _ in f) - 1  # minus header


def count_geojson_features(path):
    if not os.path.exists(path):
        return 0
    try:
        import geopandas as gpd
        gdf = gpd.read_file(path)
        return len(gdf)
    except Exception:
        try:
            with open(path) as f:
                data = json.load(f)
            return len(data.get('features', []))
        except Exception:
            return 0


def get_soa_codes_from_boundaries():
    path = os.path.join(CLEAN_DIR, 'soa_boundaries_belfast.geojson')
    if not os.path.exists(path):
        return set()
    try:
        import geopandas as gpd
        gdf = gpd.read_file(path)
        if 'SOA_CODE' in gdf.columns:
            return set(gdf['SOA_CODE'].dropna().astype(str))
        return set()
    except Exception:
        return set()


def check_soa_boundaries():
    path = os.path.join(CLEAN_DIR, 'soa_boundaries_belfast.geojson')
    result = {
        'source': 'SOA Boundaries',
        'file': path,
        'exists': os.path.exists(path),
    }
    if result['exists']:
        count = count_geojson_features(path)
        result['count'] = count
        result['coverage'] = f"{count}/{EXPECTED_SOAS}"
        pct = count / EXPECTED_SOAS * 100
        result['coverage_pct'] = pct
        if count >= 170:
            result['status'] = '✅'
            result['notes'] = f'{count} polygons, all Belfast LGD'
        elif count >= 150:
            result['status'] = '⚠️'
            result['notes'] = f'{count} polygons (expected ~{EXPECTED_SOAS})'
        else:
            result['status'] = '❌'
            result['notes'] = f'Only {count} polygons (expected ~{EXPECTED_SOAS})'
    else:
        result['status'] = '❌'
        result['count'] = 0
        result['coverage_pct'] = 0
        result['notes'] = 'File not found'
    return result


def check_census():
    results = []
    for year, filename, level in [
        (2021, 'census_2021_belfast.csv', 'SDZ'),
        (2011, 'census_2011_belfast.csv', 'SOA'),
        (2001, 'census_2001_belfast.csv', 'SOA'),
    ]:
        path = os.path.join(CLEAN_DIR, filename)
        r = {
            'source': f'Census {year}',
            'file': path,
            'exists': os.path.exists(path),
            'level': level,
        }
        if r['exists']:
            count = count_csv_rows(path)
            r['count'] = count
            if year == 2001:
                r['status'] = '⚠️' if count > 0 else '❌'
                r['notes'] = f'{count} rows (ward-level, not SOA — expected)'
                r['coverage_pct'] = 100 if count > 0 else 0
            else:
                r['coverage_pct'] = min(100, count / EXPECTED_SOAS * 100) if count > 0 else 0
                if r['coverage_pct'] >= 95:
                    r['status'] = '✅'
                elif r['coverage_pct'] >= 50:
                    r['status'] = '⚠️'
                else:
                    r['status'] = '❌'
                r['notes'] = f'{count} rows at {level} level'
        else:
            r['status'] = '❌'
            r['count'] = 0
            r['coverage_pct'] = 0
            r['notes'] = 'File not found'
        results.append(r)
    return results


def check_crime():
    path = os.path.join(CLEAN_DIR, 'crime_belfast.csv')
    result = {
        'source': 'Crime (PSNI)',
        'file': path,
        'exists': os.path.exists(path),
    }
    if result['exists']:
        count = count_csv_rows(path)
        result['count'] = count

        # Check month coverage
        try:
            import pandas as pd
            df = pd.read_csv(path, usecols=['Month'], parse_dates=['Month'])
            n_months = df['Month'].nunique()
            date_min = df['Month'].min()
            date_max = df['Month'].max()
            result['time_range'] = f"{date_min} to {date_max}"
            result['months'] = n_months
        except Exception:
            n_months = 0
            result['time_range'] = 'unknown'
            result['months'] = 0

        if n_months >= 24:
            result['status'] = '✅'
            result['notes'] = f'{count} records, {n_months} months'
        elif n_months >= 12:
            result['status'] = '⚠️'
            result['notes'] = f'{count} records, only {n_months} months (need 24+)'
        else:
            result['status'] = '❌'
            result['notes'] = f'{count} records, only {n_months} months'
        result['coverage_pct'] = min(100, n_months / 24 * 100)
    else:
        result['status'] = '❌'
        result['count'] = 0
        result['coverage_pct'] = 0
        result['notes'] = 'File not found'
    return result


def check_harni():
    results = []
    for label, filename in [
        ('Listed Buildings', 'listed_buildings_belfast.geojson'),
        ('Heritage at Risk', 'harni_belfast.geojson'),
    ]:
        path = os.path.join(CLEAN_DIR, filename)
        r = {
            'source': label,
            'file': path,
            'exists': os.path.exists(path),
        }
        if r['exists']:
            count = count_geojson_features(path)
            r['count'] = count
            r['status'] = '✅' if count > 0 else '❌'
            r['notes'] = f'{count} features in Belfast'
            r['coverage_pct'] = 100 if count > 0 else 0
        else:
            r['status'] = '❌'
            r['count'] = 0
            r['coverage_pct'] = 0
            r['notes'] = 'File not found'
        results.append(r)
    return results


def check_housing():
    path = os.path.join(CLEAN_DIR, 'housing_belfast.csv')
    result = {
        'source': 'Housing (NI HPI)',
        'file': path,
        'exists': os.path.exists(path),
    }
    if result['exists']:
        count = count_csv_rows(path)
        result['count'] = count
        # NI HPI data is quarterly LGD/ward level, not individual transactions
        # Check if we have Belfast-specific data with time series
        if count > 100:
            result['status'] = '✅'
            result['notes'] = f'{count} rows from NI House Price Index (LGD/ward level, 2005-2025)'
            result['coverage_pct'] = 100
        elif count > 0:
            result['status'] = '⚠️'
            result['notes'] = f'{count} rows — limited data'
            result['coverage_pct'] = 50
        else:
            result['status'] = '❌'
            result['notes'] = 'Empty file'
            result['coverage_pct'] = 0
    else:
        result['status'] = '❌'
        result['count'] = 0
        result['coverage_pct'] = 0
        result['notes'] = 'File not found'
    return result


def check_nimdm():
    path = os.path.join(CLEAN_DIR, 'nimdm_belfast.csv')
    result = {
        'source': 'NIMDM 2017',
        'file': path,
        'exists': os.path.exists(path),
    }
    if result['exists']:
        count = count_csv_rows(path)
        result['count'] = count
        pct = count / EXPECTED_SOAS * 100
        result['coverage_pct'] = min(100, pct)
        if pct >= 95:
            result['status'] = '✅'
        elif pct >= 50:
            result['status'] = '⚠️'
        else:
            result['status'] = '❌'
        result['notes'] = f'{count} SOAs with deprivation ranks ({pct:.0f}% coverage)'
    else:
        result['status'] = '❌'
        result['count'] = 0
        result['coverage_pct'] = 0
        result['notes'] = 'File not found'
    return result


def write_report(all_checks):
    """Write SUFFICIENCY.md."""
    lines = [
        '# Belfast UDI — Data Sufficiency Report',
        '',
        f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}',
        '',
        '## Source Summary',
        '',
        '| Status | Source | Rows/Features | Coverage | File | Notes |',
        '|--------|--------|---------------|----------|------|-------|',
    ]

    pillars = {
        'demographic': False,
        'crime': False,
        'dereliction': False,
        'housing': False,
    }

    for check in all_checks:
        status = check.get('status', '❌')
        source = check.get('source', '?')
        count = check.get('count', 0)
        coverage = f"{check.get('coverage_pct', 0):.0f}%"
        filepath = os.path.relpath(check.get('file', ''), os.path.dirname(REPORT_FILE))
        notes = check.get('notes', '')
        time_range = check.get('time_range', '')
        if time_range:
            notes += f' | Range: {time_range}'

        lines.append(f'| {status} | {source} | {count:,} | {coverage} | `{filepath}` | {notes} |')

        # Track pillar sufficiency
        if status in ('✅', '⚠️'):
            if 'Census' in source or 'NIMDM' in source:
                pillars['demographic'] = True
            if 'Crime' in source:
                pillars['crime'] = True
            if 'Listed' in source or 'Heritage' in source:
                pillars['dereliction'] = True
            if 'Housing' in source:
                pillars['housing'] = True

    lines.extend([
        '',
        '## UDI Pillar Coverage',
        '',
        '| Pillar | Status | Sources |',
        '|--------|--------|---------|',
    ])

    pillar_sources = {
        'demographic': 'Census 2021 (SDZ), NIMDM 2017',
        'crime': 'PSNI street-level crime',
        'dereliction': 'Historic Buildings Record, Industrial Heritage Record',
        'housing': 'NI House Price Index (LPS/DoF)',
    }

    all_go = True
    for pillar, ok in pillars.items():
        status = '✅' if ok else '❌'
        if not ok:
            all_go = False
        lines.append(f'| {pillar.title()} | {status} | {pillar_sources[pillar]} |')

    lines.extend([
        '',
        '## Go/No-Go',
        '',
    ])

    if all_go:
        lines.append(
            '**GO** — All four UDI pillars (demographic, crime, dereliction, housing) '
            'have sufficient data to proceed to the scoring phase.'
        )
    else:
        missing = [p.title() for p, ok in pillars.items() if not ok]
        lines.append(
            f'**NO-GO** — Missing sufficient data for: {", ".join(missing)}. '
            'Address the ❌ items above before proceeding to scoring.'
        )

    lines.extend([
        '',
        '## Caveats',
        '',
        '- Census 2021 uses Super Data Zones (SDZ), not SOAs. SDZ→SOA best-fit '
        'mapping will be needed in the scoring phase.',
        '- Census 2011 standalone data was not available via API. NIMDM 2017 '
        'contains 2011-era deprivation indicators as a proxy.',
        '- Census 2001 is ward-level only (SOAs were introduced for Census 2011). '
        'Ward-to-SOA interpolation will be needed in the scoring phase.',
        '- Crime data from data.police.uk has no records before ~2010. '
        '2001 crime baseline is unavailable — this is expected.',
        '- Housing data is from NI House Price Index (LPS/DoF), not UK Land Registry '
        '(which only covers England & Wales). Data is at LGD/ward level, not individual transactions.',
        '- Heritage data uses Historic Buildings Record and Industrial Heritage Record '
        'from DfC/HED as dereliction proxies.',
        '',
    ])

    with open(REPORT_FILE, 'w') as f:
        f.write('\n'.join(lines))

    print(f"  Report written to {REPORT_FILE}")
    return all_go


def main():
    all_checks = []

    # SOA Boundaries
    all_checks.append(check_soa_boundaries())

    # Census (returns list)
    all_checks.extend(check_census())

    # Crime
    all_checks.append(check_crime())

    # HARNI (returns list)
    all_checks.extend(check_harni())

    # Housing
    all_checks.append(check_housing())

    # NIMDM
    all_checks.append(check_nimdm())

    # Print summary
    print("  === Sufficiency Summary ===")
    for c in all_checks:
        print(f"  {c['status']} {c['source']}: {c.get('notes', '')}")

    all_go = write_report(all_checks)
    verdict = "GO ✅" if all_go else "NO-GO ❌"
    print(f"\n  Verdict: {verdict}")


if __name__ == '__main__':
    main()
