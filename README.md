# DelayDecay — Urban Decay Intelligence Platform

Interactive 3D city intelligence platform tracking urban decay across Belfast's 174 Super Output Areas over time periods (2001–2029), combining 18+ datasets with ML-powered predictions to guide urban regeneration policy.

## Layers

- **Urban Decay Index** — SOA-level composite score (demographic decline, crime, dereliction, housing) across time periods with timeline scrubber
- **3D Buildings** — 125k extruded buildings with ~90 notable buildings tagged by construction year (appear/disappear with timeline)
- **Top 50 Companies** — Major Belfast employers matched to actual building footprints, filtered by establishment year
- **Bus Stops (Translink)** — 2,013 Metro/Ulsterbus stops from OpenDataNI with transit accessibility scoring per SOA
- **Flood Risk** — DfI Rivers APSFR/TAPSFR zones with sea level rise simulator
- **Power Grid** — Substations + transmission lines from OSM (275kV/110kV/33kV/11kV)
- **Data Centre Sites** — Verified NI facilities with suitability scores
- **Live Traffic** — Real-time TomTom Traffic API speed/congestion data
- **Day/Night Mode** — Toggle between dark and light base maps

## UDI Scoring

Four pillars weighted into a composite 0–1 score per SOA:

| Pillar | Weight | Source |
|--------|--------|--------|
| Demographic Decline | 0.30 | NISRA Census 2001/2011/2021 + NIMDM 2017 |
| Crime | 0.25 | NIMDM crime rank × PSNI recorded crime rate trend |
| Dereliction | 0.25 | DfC heritage-at-risk + listed buildings density |
| Housing | 0.20 | NIMDM living environment rank |

**9 time periods:** 2001, 2006, 2009, 2011, 2016, 2021, 2025, 2027 (predicted), 2029 (predicted)

**ML Prediction:** 60% weighted linear trend + 40% Random Forest (scikit-learn), spatially smoothed with momentum constraints.

## Quick Start

### Frontend
```bash
cd belfast-3d
npm install
npm run dev
```
Open http://localhost:5173

### Data Pipeline (regenerate UDI scores)
```bash
cd belfast-udi-data
pip install -r requirements.txt
python scripts/10_compute_udi.py   # Compute UDI for 7 periods
python scripts/11_predict_udi.py   # ML predictions for 2027/2029
```

### Backend (optional — enables AI chat)
```bash
cd belfast-3d/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your ANTHROPIC_API_KEY
uvicorn main:app --port 8000 --reload
```

## Tech Stack

- **3D Map**: deck.gl (GeoJsonLayer, ScatterplotLayer, ColumnLayer, TextLayer) + MapLibre GL JS
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Base Maps**: CARTO Dark Matter / Positron (day/night), MapTiler Satellite (high zoom)
- **Data Processing**: Python 3 + pandas + geopandas + openpyxl
- **ML**: scikit-learn Random Forest Regressor + numpy weighted linear regression
- **Live Data**: TomTom Traffic Flow API

## Data Sources

| Source | Datasets |
|--------|----------|
| NISRA | Census 2001/2011/2021, NIMDM 2017, SOA boundaries |
| PSNI | Recorded crime by district 2001–2025 (Tables 9.1–9.4), crime by type (Pivot Table) |
| DfC/HED | Listed Buildings (2,347), Industrial Heritage Record (1,062) |
| LPS/DoF | NI House Price Index 2005–2025 |
| OpenDataNI | Translink bus stops (2,013 Belfast), heritage datasets |
| ONS | Private rent index (NI) |
| TomTom | Real-time traffic flow API |
| OpenStreetMap | Building footprints (125k), power grid, roads |
| DfI Rivers | Flood risk zones |

## Key Findings

- Belfast mean UDI: 0.459 (2001) → 0.430 (2011) → 0.402 (2025) → 0.427 (2029 predicted)
- Worst SOA: Duncairn 1 (UDI 0.77) — persistent across all periods
- Collin Glen 1 has 0 bus stops within 500m — worst transit accessibility
- Derelict vacancy rate: ~22% (2001) → 33% (2025)
- Belfast crime rate: 143/1k (2001) → 92/1k (2025)

