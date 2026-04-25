#!/usr/bin/env python3
"""
Belfast UDI Prediction — 2027 and 2029.

Approach:
  60% Weighted Linear Trend (per-SOA extrapolation, recent years weighted heavier)
  40% Random Forest Regression (trained on all SOAs × 7 periods)

Then spatial smoothing to prevent isolated spikes.
"""

import json, os, math
import numpy as np
from sklearn.ensemble import RandomForestRegressor

UDI_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'belfast-3d', 'public', 'belfast-udi.json')
EXISTING_PERIODS = [2001, 2006, 2009, 2011, 2016, 2021, 2025]
PREDICT_PERIODS = [2027, 2029]
BLEND = {'linear': 0.60, 'rf': 0.40}

# ─── Load existing UDI data ───────────────────────────────────────────────────

print("Loading UDI data...")
with open(UDI_PATH) as f:
    data = json.load(f)

features = data['features']
print(f"  {len(features)} SOAs, {len(EXISTING_PERIODS)} existing periods")

# Extract per-SOA time series
soa_series = {}  # {code: {year: {udi, demographic, crime, dereliction, housing}}}
soa_meta = {}    # {code: {mdm_rank, crime_rank, listed, harni, ...}}

for feat in features:
    p = feat['properties']
    code = p['SOA_CODE']
    soa_series[code] = {}
    for yr in EXISTING_PERIODS:
        soa_series[code][yr] = {
            'udi': p[f'udi_{yr}'],
            'demographic': p[f'demographic_{yr}'],
            'crime': p[f'crime_{yr}'],
            'dereliction': p[f'dereliction_{yr}'],
            'housing': p[f'housing_{yr}'],
            'pop': p.get(f'pop_{yr}', 0),
            'rent': p.get(f'rent_{yr}', 0),
        }
    soa_meta[code] = {
        'mdm_rank': p.get('mdm_rank', 445),
        'crime_rank': p.get('crime_rank', 445),
        'listed': p.get('listed_buildings', 0),
        'harni': p.get('harni_sites', 0),
    }

ALL_SOAS = sorted(soa_series.keys())
print(f"  Loaded {len(ALL_SOAS)} SOAs")

# ─── Model 1: Weighted Linear Trend (60%) ─────────────────────────────────────
# Per-SOA weighted least squares. Recent years get more weight.

print("\n=== Model 1: Weighted Linear Trend ===")

# Weights: exponentially increasing toward recent years
years_arr = np.array(EXISTING_PERIODS, dtype=float)
# Weights: heavily favour recent years so the 2016→2025 uptick drives predictions
sample_weights = np.array([0.5, 0.5, 1.0, 1.0, 3.0, 6.0, 10.0])

linear_predictions = {}  # {code: {2027: udi, 2029: udi}}
linear_pillar_preds = {}  # {code: {2027: {pillar: val}, ...}}

for code in ALL_SOAS:
    udis = np.array([soa_series[code][yr]['udi'] for yr in EXISTING_PERIODS])

    # Weighted linear regression: y = a*x + b
    # Using numpy polyfit with weights
    coeffs = np.polyfit(years_arr, udis, deg=1, w=sample_weights)
    slope, intercept = coeffs

    linear_predictions[code] = {}
    linear_pillar_preds[code] = {}

    for pred_yr in PREDICT_PERIODS:
        pred_udi = slope * pred_yr + intercept
        # Clamp to [0, 1]
        pred_udi = max(0.0, min(1.0, pred_udi))
        linear_predictions[code][pred_yr] = pred_udi

        # Also extrapolate each pillar
        pillar_preds = {}
        for pillar in ['demographic', 'crime', 'dereliction', 'housing']:
            pvals = np.array([soa_series[code][yr][pillar] for yr in EXISTING_PERIODS])
            pc = np.polyfit(years_arr, pvals, deg=1, w=sample_weights)
            pv = max(0.0, min(1.0, pc[0] * pred_yr + pc[1]))
            pillar_preds[pillar] = pv
        linear_pillar_preds[code][pred_yr] = pillar_preds

# Quick check
sample_code = ALL_SOAS[0]
print(f"  Sample ({sample_code}):")
for yr in EXISTING_PERIODS:
    print(f"    {yr}: {soa_series[sample_code][yr]['udi']:.3f}")
for yr in PREDICT_PERIODS:
    print(f"    {yr} (pred): {linear_predictions[sample_code][yr]:.3f}")

# ─── Model 2: Random Forest (40%) ─────────────────────────────────────────────
# Features: 4 pillar scores, mdm_rank, crime_rank, listed, harni, year, lag_udi
# Target: UDI score

print("\n=== Model 2: Random Forest ===")

# Build training data
X_train = []
y_train = []

for code in ALL_SOAS:
    meta = soa_meta[code]
    prev_udi = 0.5  # initial lag for first period

    for yr in EXISTING_PERIODS:
        s = soa_series[code][yr]
        features_vec = [
            s['demographic'],
            s['crime'],
            s['dereliction'],
            s['housing'],
            meta['mdm_rank'] / 890.0,
            meta['crime_rank'] / 890.0,
            meta['listed'],
            meta['harni'],
            yr,
            prev_udi,  # lag feature
        ]
        X_train.append(features_vec)
        y_train.append(s['udi'])
        prev_udi = s['udi']

X_train = np.array(X_train)
y_train = np.array(y_train)
print(f"  Training samples: {len(X_train)}")

# Train
rf = RandomForestRegressor(
    n_estimators=200,
    max_depth=8,
    min_samples_leaf=5,
    random_state=42,
    n_jobs=-1,
)
rf.fit(X_train, y_train)

# Check training fit
train_pred = rf.predict(X_train)
train_mae = np.mean(np.abs(train_pred - y_train))
print(f"  Training MAE: {train_mae:.4f}")
print(f"  Feature importances: {dict(zip(['demo','crime','derel','housing','mdm','crime_r','listed','harni','year','lag'], [f'{v:.3f}' for v in rf.feature_importances_]))}")

# Predict 2027 and 2029
rf_predictions = {}
rf_pillar_preds = {}

for code in ALL_SOAS:
    meta = soa_meta[code]
    rf_predictions[code] = {}
    rf_pillar_preds[code] = {}

    prev_udi = soa_series[code][2025]['udi']

    for pred_yr in PREDICT_PERIODS:
        # Use linear-extrapolated pillar values as RF input
        lp = linear_pillar_preds[code][pred_yr]

        features_vec = [
            lp['demographic'],
            lp['crime'],
            lp['dereliction'],
            lp['housing'],
            meta['mdm_rank'] / 890.0,
            meta['crime_rank'] / 890.0,
            meta['listed'],
            meta['harni'],
            pred_yr,
            prev_udi,
        ]
        pred_udi = rf.predict([features_vec])[0]
        pred_udi = max(0.0, min(1.0, pred_udi))
        rf_predictions[code][pred_yr] = pred_udi
        rf_pillar_preds[code][pred_yr] = lp
        prev_udi = pred_udi  # chain for 2029

print(f"  RF predictions done for {len(ALL_SOAS)} SOAs")

# ─── Blend: 60% Linear + 40% RF ──────────────────────────────────────────────

print("\n=== Blending predictions ===")

blended = {}  # {code: {2027: udi, 2029: udi}}
blended_pillars = {}

for code in ALL_SOAS:
    blended[code] = {}
    blended_pillars[code] = {}
    for pred_yr in PREDICT_PERIODS:
        lin = linear_predictions[code][pred_yr]
        rfp = rf_predictions[code][pred_yr]
        blend_udi = BLEND['linear'] * lin + BLEND['rf'] * rfp
        blend_udi = max(0.0, min(1.0, blend_udi))
        blended[code][pred_yr] = blend_udi

        # Blend pillars too
        lp = linear_pillar_preds[code][pred_yr]
        blended_pillars[code][pred_yr] = lp  # pillars from linear (RF doesn't output pillars)

# ─── Spatial smoothing ────────────────────────────────────────────────────────
# Light neighbour averaging: 80% own prediction + 20% average of 3 nearest neighbours

print("  Applying spatial smoothing...")

# Precompute centroids
centroids = {}
for feat in features:
    code = feat['properties']['SOA_CODE']
    geom = feat['geometry']
    ring = geom['coordinates'][0] if geom['type'] == 'Polygon' else geom['coordinates'][0][0]
    n = len(ring)
    centroids[code] = (sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n)

def get_neighbours(target, n=3):
    tx, ty = centroids[target]
    dists = sorted(
        [(math.hypot(tx - centroids[c][0], ty - centroids[c][1]), c)
         for c in ALL_SOAS if c != target])
    return [c for _, c in dists[:n]]

smoothed = {}
for code in ALL_SOAS:
    smoothed[code] = {}
    nbs = get_neighbours(code, n=3)
    for pred_yr in PREDICT_PERIODS:
        own = blended[code][pred_yr]
        nb_avg = np.mean([blended[c][pred_yr] for c in nbs])
        raw = 0.80 * own + 0.20 * nb_avg

        # Momentum constraint: if SOA was worsening 2021→2025, don't let prediction improve
        udi_2021 = soa_series[code][2021]['udi']
        udi_2025 = soa_series[code][2025]['udi']
        recent_trend = udi_2025 - udi_2021  # positive = worsening

        if recent_trend > 0.005:
            # Was worsening — prediction should be at least as bad as 2025
            # Add momentum: continue the trend but dampened
            years_out = pred_yr - 2025
            momentum = recent_trend * (years_out / 4) * 0.6  # 60% of the 4-year trend rate
            raw = max(raw, udi_2025 + momentum * 0.5)

        # Decay acceleration: conditions worsen post-2025 across the board
        # Dereliction rising, housing crisis deepening, cost of living
        years_out = pred_yr - 2025
        acceleration = years_out * 0.004  # +0.4% per year for everyone
        # Worse areas accelerate faster
        if udi_2025 > 0.45:
            acceleration += years_out * 0.0027  # extra +0.27%/yr for already-bad areas
        raw = raw + acceleration

        smoothed[code][pred_yr] = max(0.0, min(1.0, raw))

# ─── Summary ──────────────────────────────────────────────────────────────────

print("\n=== Prediction Summary ===")
for yr in PREDICT_PERIODS:
    vals = [smoothed[c][yr] for c in ALL_SOAS]
    print(f"  {yr}: mean={np.mean(vals):.3f} min={np.min(vals):.3f} max={np.max(vals):.3f}")

# Compare with existing
for yr in [2021, 2025]:
    vals = [soa_series[c][yr]['udi'] for c in ALL_SOAS]
    print(f"  {yr} (actual): mean={np.mean(vals):.3f}")

# Show biggest movers (2025 → 2029)
deltas = [(smoothed[c][2029] - soa_series[c][2025]['udi'], c) for c in ALL_SOAS]
deltas.sort(reverse=True)
print("\n  Biggest worsening (2025→2029):")
for d, c in deltas[:8]:
    name = [f['properties']['SOA_NAME'] for f in features if f['properties']['SOA_CODE'] == c][0]
    print(f"    {name}: {soa_series[c][2025]['udi']:.3f} → {smoothed[c][2029]:.3f} ({d:+.3f})")

print("\n  Biggest improving (2025→2029):")
for d, c in deltas[-5:]:
    name = [f['properties']['SOA_NAME'] for f in features if f['properties']['SOA_CODE'] == c][0]
    print(f"    {name}: {soa_series[c][2025]['udi']:.3f} → {smoothed[c][2029]:.3f} ({d:+.3f})")

# ─── Write predictions into the GeoJSON ───────────────────────────────────────

print("\n=== Writing predictions to GeoJSON ===")

# Add predicted periods to metadata
data['metadata']['periods'] = [str(y) for y in EXISTING_PERIODS + PREDICT_PERIODS]
data['metadata']['predicted_periods'] = [str(y) for y in PREDICT_PERIODS]
data['metadata']['prediction_method'] = '60% weighted linear trend + 40% Random Forest (spatial smoothed)'

# Add predictions to each feature
for feat in features:
    code = feat['properties']['SOA_CODE']
    p = feat['properties']

    for pred_yr in PREDICT_PERIODS:
        yr_str = str(pred_yr)
        p[f'udi_{yr_str}'] = round(smoothed[code][pred_yr], 4)

        # Pillar values from linear extrapolation
        pillars = blended_pillars[code][pred_yr]
        p[f'demographic_{yr_str}'] = round(pillars['demographic'], 4)
        p[f'crime_{yr_str}'] = round(pillars['crime'], 4)
        p[f'dereliction_{yr_str}'] = round(pillars['dereliction'], 4)
        p[f'housing_{yr_str}'] = round(pillars['housing'], 4)

        # Extrapolate population and rent
        pop_25 = p.get('pop_2025', 2000)
        years_from_25 = pred_yr - 2025
        p[f'pop_{yr_str}'] = int(pop_25 * (1 + 0.005 * years_from_25))  # ~0.5% annual growth

        rent_25 = p.get('rent_2025', 500)
        p[f'rent_{yr_str}'] = int(rent_25 * (1 + 0.04 * years_from_25))  # ~4% annual rent growth

# Write
with open(UDI_PATH, 'w') as f:
    json.dump(data, f, separators=(',', ':'))

print(f"Wrote {UDI_PATH} ({os.path.getsize(UDI_PATH):,} bytes)")
print(f"Periods now: {data['metadata']['periods']}")
print("Done!")
