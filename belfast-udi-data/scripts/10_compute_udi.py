#!/usr/bin/env python3
"""
Belfast Urban Decay Index (UDI) — SOA-level scoring, 7 time periods.

Periods: 2001, 2006, 2009, 2011, 2016, 2021, 2025

Pillars (original weights):
  1. Demographic Decline (0.30) — pop change, age proxy from NIMDM health rank
  2. Crime (0.25)              — NIMDM crime rank × Belfast crime rate ratio
  3. Dereliction (0.25)        — HARNI/listed density (static, same all periods)
  4. House Prices (0.20)       — NIMDM living-env rank, damped for earlier periods
"""

import json, os, csv, math
from collections import defaultdict

CLEAN = os.path.join(os.path.dirname(__file__), '..', 'data', 'clean')
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'belfast-3d', 'public', 'belfast-udi.json')

WEIGHTS = {'demographic': 0.25, 'crime': 0.25, 'dereliction': 0.30, 'housing': 0.20}
PERIODS = ['2001', '2006', '2009', '2011', '2016', '2021', '2025']

# Belfast crime rate per 1k (Table 9.3)
CRIME_RATE = {
    '2001': 143, '2006': 112, '2009': 101, '2011': 96,
    '2016': 105, '2021': 95, '2025': 92,
}
CRIME_PEAK = max(CRIME_RATE.values())  # 143

# Belfast standardised house price (NI HPI Table 5)
HOUSE_PRICE = {
    '2001': 85000, '2006': 135554, '2009': 125668, '2011': 99701,
    '2016': 110299, '2021': 138563, '2025': 174325,
}

# ─── Helpers ───────────────────────────────────────────────────────────────────

def load_csv(name):
    with open(os.path.join(CLEAN, name)) as f:
        return list(csv.DictReader(f))

def load_geojson(name):
    with open(os.path.join(CLEAN, name)) as f:
        return json.load(f)

def minmax(values):
    vals = {k: v for k, v in values.items() if v is not None}
    if not vals: return {k: 0.5 for k in values}
    lo, hi = min(vals.values()), max(vals.values())
    rng = hi - lo if hi != lo else 1
    return {k: ((v - lo) / rng if v is not None else 0.5) for k, v in values.items()}

def point_in_polygon(px, py, polygon):
    n, inside, j = len(polygon), False, len(polygon) - 1
    for i in range(n):
        xi, yi = polygon[i]; xj, yj = polygon[j]
        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside

def point_in_feature(px, py, feature):
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        return point_in_polygon(px, py, geom['coordinates'][0])
    elif geom['type'] == 'MultiPolygon':
        return any(point_in_polygon(px, py, poly[0]) for poly in geom['coordinates'])
    return False

def centroid(feature):
    geom = feature['geometry']
    ring = geom['coordinates'][0] if geom['type'] == 'Polygon' else geom['coordinates'][0][0]
    n = len(ring)
    return sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n

def lerp(a, b, t):
    return a + (b - a) * t

# ─── Load data ─────────────────────────────────────────────────────────────────

print("Loading data...")
boundaries = load_geojson('soa_boundaries_belfast.geojson')
soa_features = {f['properties']['SOA_CODE']: f for f in boundaries['features']}
ALL_SOAS = sorted(soa_features.keys())
soa_centroids = {code: centroid(feat) for code, feat in soa_features.items()}
print(f"  {len(ALL_SOAS)} SOAs")

census_2001 = {r['SOA_CODE']: r for r in load_csv('census_2001_belfast.csv')}
census_2011 = {r['SOA_CODE']: r for r in load_csv('census_2011_belfast.csv')}
nimdm = {r['SOA_CODE']: r for r in load_csv('nimdm_belfast.csv')}

def nearest_neighbours(target, pool, n=3):
    tx, ty = soa_centroids[target]
    dists = sorted(
        [(math.hypot(tx - soa_centroids[c][0], ty - soa_centroids[c][1]), c)
         for c in pool if c != target and c in soa_centroids])
    return [c for _, c in dists[:n]]

# ─── PILLAR 1: Demographic Decline (0.30) ─────────────────────────────────────
# Original logic: age proxy from NIMDM health rank + population change between censuses.
# For intermediate years, interpolate pop. Pop growth = lower score, decline = higher.

print("\n=== Pillar 1: Demographic Decline ===")

pillar1 = {}
for code in ALL_SOAS:
    ndm = nimdm.get(code)
    c01 = census_2001.get(code)
    c11 = census_2011.get(code)

    # Age proxy from NIMDM health rank (rank 1 = worst = score 1.0)
    if ndm:
        age_proxy = 1.0 - (int(ndm['HEALTH_RANK']) / 890.0)
    else:
        age_proxy = 0.5

    # Get/estimate population
    pop_01 = int(c01['All_persons']) if c01 else None
    pop_11 = int(c11['All_usual_residents']) if c11 else None

    if pop_01 is None:
        nbs = nearest_neighbours(code, list(census_2001.keys()))
        pop_01 = int(sum(int(census_2001[n]['All_persons']) for n in nbs) / max(len(nbs), 1)) if nbs else 1800
    if pop_11 is None:
        nbs = nearest_neighbours(code, list(census_2011.keys()))
        pop_11 = int(sum(int(census_2011[n]['All_usual_residents']) for n in nbs) / max(len(nbs), 1)) if nbs else 1800

    total_2011 = sum(int(r['All_usual_residents']) for r in census_2011.values())
    pop_21 = int(pop_11 * (345000 / total_2011)) if total_2011 else pop_11
    pop_25 = int(pop_21 * 1.02)

    pops = {
        '2001': pop_01,
        '2006': int(lerp(pop_01, pop_11, 0.5)),
        '2009': int(lerp(pop_01, pop_11, 0.8)),
        '2011': pop_11,
        '2016': int(lerp(pop_11, pop_21, 0.5)),
        '2021': pop_21,
        '2025': pop_25,
    }

    pillar1[code] = {'pops': pops}

    # 2001: baseline — just age proxy
    pillar1[code]['2001'] = age_proxy

    # Other periods: 60% normalised pop change (decline=high) + 40% age proxy
    # Pop change is relative to the PREVIOUS census anchor
    for period in PERIODS[1:]:
        yr = int(period)
        if yr <= 2011:
            ref_pop = pop_01
        else:
            ref_pop = pop_11
        cur_pop = pops[period]
        pct_change = ((cur_pop - ref_pop) / ref_pop * 100) if ref_pop > 0 else 0
        # Negate: decline = positive score
        pillar1[code][period] = pct_change  # raw, will normalise below

# Normalise pop change per period
for period in PERIODS[1:]:
    raw = {c: -pillar1[c][period] for c in ALL_SOAS}  # negate so decline = high
    normed = minmax(raw)
    for code in ALL_SOAS:
        pillar1[code][period] = 0.6 * normed[code] + 0.4 * pillar1[code]['2001']  # age_proxy stored in 2001

print(f"  Done: {len(pillar1)} SOAs")

# ─── PILLAR 2: Crime (0.25) ───────────────────────────────────────────────────
# Original logic: NIMDM crime rank × (period rate / peak rate)
# Simple ratio scaling — no "felt crime" adjustment.

print("\n=== Pillar 2: Crime ===")

pillar2 = {}
for code in ALL_SOAS:
    ndm = nimdm.get(code)
    base = (1.0 - (int(ndm['CRIME_RANK']) / 890.0)) if ndm else 0.5

    pillar2[code] = {}
    for period in PERIODS:
        rate_scale = CRIME_RATE[period] / CRIME_PEAK
        pillar2[code][period] = min(1.0, base * rate_scale)

print(f"  Done: {len(pillar2)} SOAs")
rate_scales = {p: f"{CRIME_RATE[p]/CRIME_PEAK:.2f}" for p in PERIODS}
print(f"  Rate scales: {rate_scales}")

# ─── PILLAR 3: Dereliction (0.25) — STATIC ───────────────────────────────────
# Original logic: same score for all periods. No temporal scaling.

print("\n=== Pillar 3: Dereliction (static) ===")

listed = load_geojson('listed_buildings_belfast.geojson')
harni = load_geojson('harni_belfast.geojson')

def count_points_per_soa(features):
    counts = defaultdict(int)
    unmatched = 0
    for feat in features:
        geom = feat['geometry']
        if geom['type'] == 'Point': px, py = geom['coordinates'][:2]
        elif geom['type'] == 'MultiPoint': px, py = geom['coordinates'][0][:2]
        else: unmatched += 1; continue
        matched = False
        for code, soa_feat in soa_features.items():
            if point_in_feature(px, py, soa_feat):
                counts[code] += 1; matched = True; break
        if not matched: unmatched += 1
    return counts, unmatched

print("  Counting listed buildings per SOA...")
listed_counts, lu = count_points_per_soa(listed['features'])
print(f"    Matched: {sum(listed_counts.values())}, Unmatched: {lu}")

print("  Counting HARNI sites per SOA...")
harni_counts, hu = count_points_per_soa(harni['features'])
print(f"    Matched: {sum(harni_counts.values())}, Unmatched: {hu}")

raw_der = {}
for code in ALL_SOAS:
    h = harni_counts.get(code, 0)
    l = listed_counts.get(code, 0)
    raw_der[code] = {'harni': h, 'listed': l, 'ratio': h / (l + 1)}

harni_n = minmax({c: d['harni'] for c, d in raw_der.items()})
ratio_n = minmax({c: d['ratio'] for c, d in raw_der.items()})
total_n = minmax({c: d['harni'] + d['listed'] for c, d in raw_der.items()})

pillar3 = {}
for code in ALL_SOAS:
    score = 0.50 * harni_n[code] + 0.30 * ratio_n[code] + 0.20 * total_n[code]
    # Static for 2001-2016, then scale up for 2021/2025 based on vacancy trend
    # Derelict properties: ~22% (2001-2016 avg) → 30% (2021) → 33% (2025)
    pillar3[code] = {}
    for period in PERIODS:
        if period in ('2021',):
            pillar3[code][period] = min(1.0, score * 1.40)
        elif period in ('2025',):
            pillar3[code][period] = min(1.0, score * 1.65)
        else:
            pillar3[code][period] = score

print(f"  Done: {len(pillar3)} SOAs (static across all periods)")

# ─── PILLAR 4: Housing (0.30) ─────────────────────────────────────────────────
# What matters is whether an SOA's rent is ABOVE or BELOW the city average.
# Below average = more decay. Above average = less decay.
# The absolute rent level doesn't matter — it's the relative position.

print("\n=== Pillar 4: Housing ===")

pillar4 = {}
for code in ALL_SOAS:
    ndm = nimdm.get(code)
    base = (1.0 - (int(ndm['LIVING_ENV_RANK']) / 890.0)) if ndm else 0.5

    # Damping for earlier periods (less data confidence)
    damping = {
        '2001': 0.30, '2006': 0.45, '2009': 0.55, '2011': 0.70,
        '2016': 0.80, '2021': 0.90, '2025': 1.00,
    }
    pillar4[code] = {}
    for period in PERIODS:
        d = damping[period]
        pillar4[code][period] = d * base + (1 - d) * 0.5

print(f"  Done: {len(pillar4)} SOAs")

# ─── COMPOSITE UDI ────────────────────────────────────────────────────────────

print("\n=== Computing Composite UDI ===")

udi_scores = {}
for code in ALL_SOAS:
    udi_scores[code] = {}
    for period in PERIODS:
        p1 = pillar1[code][period]
        p2 = pillar2[code][period]
        p3 = pillar3[code][period]
        p4 = pillar4[code][period]
        composite = (WEIGHTS['demographic'] * p1 + WEIGHTS['crime'] * p2 +
                     WEIGHTS['dereliction'] * p3 + WEIGHTS['housing'] * p4)
        udi_scores[code][period] = {
            'udi': round(composite, 4),
            'demographic': round(p1, 4),
            'crime': round(p2, 4),
            'dereliction': round(p3, 4),
            'housing': round(p4, 4),
        }

for period in PERIODS:
    scores = [udi_scores[c][period]['udi'] for c in ALL_SOAS]
    buckets = [0]*6
    for v in scores:
        if v < 0.2: buckets[0] += 1
        elif v < 0.35: buckets[1] += 1
        elif v < 0.45: buckets[2] += 1
        elif v < 0.55: buckets[3] += 1
        elif v < 0.65: buckets[4] += 1
        else: buckets[5] += 1
    print(f"  {period}: mean={sum(scores)/len(scores):.3f} | "
          f"green={buckets[0]} yg={buckets[1]} yellow={buckets[2]} "
          f"orange={buckets[3]} red={buckets[4]} dkred={buckets[5]}")

means = {p: sum(udi_scores[c][p]['udi'] for c in ALL_SOAS) / len(ALL_SOAS) for p in PERIODS}
print(f"\n  Trend: {' → '.join(f'{p}={means[p]:.3f}' for p in PERIODS)}")

# ─── Load rent + postcodes ────────────────────────────────────────────────────

print("\n=== Loading rent data ===")
rent_rows = load_csv('rent_index_belfast.csv')
RENT_BY_YEAR = {int(r['year']): int(r['avg_monthly_rent_gbp']) for r in rent_rows}
RENT = {period: RENT_BY_YEAR.get(int(period), 500) for period in PERIODS}
print(f"  Rent: {RENT}")

print("  Collecting postcodes per SOA...")
soa_postcodes = defaultdict(set)
for src in [listed, harni]:
    for feat in src['features']:
        pc = feat['properties'].get('Postcode')
        if not pc: continue
        geom = feat['geometry']
        if geom['type'] != 'Point': continue
        px, py = geom['coordinates'][:2]
        for code, soa_feat in soa_features.items():
            if point_in_feature(px, py, soa_feat):
                soa_postcodes[code].add(pc)
                break

soa_rents = {}
for code in ALL_SOAS:
    ndm = nimdm.get(code)
    rank_frac = (int(ndm['MDM_RANK']) / 890.0) if ndm else 0.5
    rent_scale = 0.55 + rank_frac * 0.90
    soa_rents[code] = {p: int(RENT[p] * rent_scale) for p in PERIODS}

# ─── Build output GeoJSON ─────────────────────────────────────────────────────

print("\n=== Building output GeoJSON ===")

def trim_coords(coords, precision=5):
    if isinstance(coords[0], (int, float)):
        return [round(c, precision) for c in coords]
    return [trim_coords(c, precision) for c in coords]

output_features = []
for code in ALL_SOAS:
    feat = soa_features[code]
    props = {'SOA_CODE': code, 'SOA_NAME': feat['properties']['SOA_NAME']}

    for period in PERIODS:
        s = udi_scores[code][period]
        for k, v in s.items():
            props[f'{k}_{period}'] = v
        props[f'pop_{period}'] = pillar1[code]['pops'][period]
        props[f'rent_{period}'] = soa_rents[code][period]

    ndm = nimdm.get(code)
    if ndm:
        props['mdm_rank'] = int(ndm['MDM_RANK'])
        props['crime_rank'] = int(ndm['CRIME_RANK'])

    props['listed_buildings'] = listed_counts.get(code, 0)
    props['harni_sites'] = harni_counts.get(code, 0)
    pcs = sorted(soa_postcodes.get(code, set()))
    props['postcodes'] = ', '.join(pcs[:10]) if pcs else ''

    output_features.append({
        'type': 'Feature',
        'properties': props,
        'geometry': {'type': feat['geometry']['type'],
                     'coordinates': trim_coords(feat['geometry']['coordinates'])},
    })

output = {
    'type': 'FeatureCollection',
    'metadata': {
        'title': 'Belfast Urban Decay Index (UDI)',
        'periods': PERIODS,
        'weights': WEIGHTS,
        'house_prices': HOUSE_PRICE,
        'crime_rates': CRIME_RATE,
        'avg_rent': RENT,
    },
    'features': output_features,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(output, f, separators=(',', ':'))

print(f"\nWrote {OUT} ({os.path.getsize(OUT):,} bytes, {len(output_features)} features)")
print("Done!")
