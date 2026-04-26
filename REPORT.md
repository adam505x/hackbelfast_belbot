# Belfast 3D — Urban Decay Intelligence Platform
## Full Technical Report

---

## 1. Platform Overview

Belfast 3D is a browser-based geospatial intelligence platform that visualises urban decay across Belfast's 174 Super Output Areas (SOAs) over 9 time periods (2001–2029), combining census data, crime statistics, heritage records, housing data, and machine learning predictions into an interactive 3D map.

---

## 2. Datasets Used

### 2.1 Geospatial Boundaries
| Dataset | Source | Format | Records | Coverage |
|---------|--------|--------|---------|----------|
| SOA Boundaries (2011) | NISRA via OpenDataNI | GeoJSON | 174 polygons | Belfast LGD2014 |
| Building Footprints | OpenStreetMap (Overpass API) | Custom JSON | 125,100 buildings | Belfast metro area |

### 2.2 Census & Demographics
| Dataset | Source | Format | Records | Years |
|---------|--------|--------|---------|-------|
| Census 2001 (SOA) | NISRA | CSV | 150 SOAs | 2001 |
| Census 2011 (SOA) | NISRA | CSV | 150 SOAs | 2011 |
| Census 2021 (SDZ) | NISRA Phase 1 Bulk Download | CSV | 350 rows (175 SDZs × 2 tables) | 2021 |
| NIMDM 2017 | NISRA | CSV | 174 SOAs | 2017 (based on 2014-2017 data) |

### 2.3 Crime
| Dataset | Source | Format | Records | Years |
|---------|--------|--------|---------|-------|
| PSNI Recorded Crime (Table 9.1) | PSNI Official Statistics | Excel | 24 years × 16 districts | 2001/02–2024/25 |
| PSNI Crime by Type (Pivot Table) | PSNI Official Statistics | Excel | 24 years × 11 districts × 21 types | 2001/02–2024/25 |
| PSNI Crime Rate per 1,000 (Table 9.3) | PSNI Official Statistics | Excel | 24 years × 12 districts | 2001/02–2024/25 |
| PSNI Population (Table 9.4) | PSNI / NISRA | Excel | 24 years × 12 districts | 2001–2024 |

### 2.4 Heritage & Dereliction
| Dataset | Source | Format | Records | Notes |
|---------|--------|--------|---------|-------|
| Listed Buildings | DfC Historic Buildings Record via OpenDataNI | GeoJSON | 2,347 features | With postcodes extracted from addresses |
| Heritage at Risk (HARNI) | DfC/HED Industrial Heritage Record via OpenDataNI | GeoJSON | 1,062 features | Postcodes assigned from nearest listed building |

### 2.5 Housing & Rent
| Dataset | Source | Format | Records | Years |
|---------|--------|--------|---------|-------|
| NI House Price Index | LPS/DoF (NI HPI Table 5) | Excel | 21 years × 11 districts | 2005–2025 (quarterly) |
| Belfast Rent Index | ONS PIPR, Ulster University, PropertyPal (compiled) | CSV | 25 years | 2001–2025 (annual estimates) |

### 2.6 Transport
| Dataset | Source | Format | Records | Notes |
|---------|--------|--------|---------|-------|
| Bus Stops (Translink) | OpenDataNI | GeoJSON | 2,013 Belfast stops (16,603 NI-wide) | April 2024 snapshot |
| Transit Accessibility Score | Computed | CSV | 174 SOAs | Stops within 500m of SOA centroid |

### 2.7 Live Data
| Dataset | Source | Format | Notes |
|---------|--------|--------|-------|
| Traffic Flow | TomTom Traffic API | JSON (REST) | Real-time speed/congestion for Belfast road network |

### 2.8 Other Map Layers
| Dataset | Source | Format | Notes |
|---------|--------|--------|-------|
| Flood Risk Zones | Rivers Agency / DfI | GeoJSON | Belfast flood plains |
| Power Grid (NI) | OpenStreetMap | GeoJSON | Transmission lines + substations |
| Data Centre Sites | Compiled | JSON | Potential/existing sites with suitability scores |
| Top 50 Companies | Compiled (web research) | JS module | 31 companies matched to building footprints with establishment years |

---

## 3. Tools & Technologies

### 3.1 Frontend
| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite | Build tool / dev server |
| deck.gl | WebGL-powered geospatial layer rendering (GeoJsonLayer, ScatterplotLayer, ColumnLayer, TextLayer) |
| MapLibre GL JS | Base map rendering (via react-map-gl) |
| Tailwind CSS | Styling |
| CARTO Dark Matter / Positron | Base map tiles (night/day modes) |

### 3.2 Data Processing (Python)
| Tool | Purpose |
|------|---------|
| Python 3 | All data processing scripts |
| openpyxl | Excel file parsing (PSNI crime data, NI HPI) |
| pandas | CSV/data manipulation |
| geopandas | GeoJSON spatial operations |
| scikit-learn | Random Forest regression for UDI prediction |
| numpy | Numerical operations, weighted linear regression |

### 3.3 APIs
| API | Purpose |
|-----|---------|
| TomTom Traffic Flow API | Real-time traffic speed/congestion data |
| OpenDataNI CKAN API | Programmatic access to NI open data catalogue |
| NISRA Data Portal | Census and statistical geography data |

### 3.4 Map Tile Providers
| Provider | Style | Usage |
|----------|-------|-------|
| CARTO | Dark Matter | Night mode base map |
| CARTO | Positron | Day mode base map |
| MapTiler | Hybrid Satellite | High-zoom (≥18) satellite imagery |

---

## 4. Urban Decay Index (UDI) — Scoring Methodology

### 4.1 Pillar Weights
| Pillar | Weight | Source |
|--------|--------|--------|
| Demographic Decline | 0.30 | Census 2001/2011/2021 + NIMDM health/income ranks |
| Crime | 0.25 | NIMDM crime rank × PSNI rate ratio (period/peak) |
| Dereliction | 0.25 | HARNI + listed buildings density per SOA (static 2001-2016, scaled ×1.40 for 2021, ×1.65 for 2025) |
| Housing | 0.20 | NIMDM living environment rank, damped toward neutral for earlier periods |

### 4.2 Time Periods
| Period | Type | Key Data |
|--------|------|----------|
| 2001 | Census anchor | Census 2001, PSNI crime rate 143/1k |
| 2006 | Interpolated | Pop interpolated, crime rate 112/1k, house price £135k |
| 2009 | Interpolated | Post-crash, crime 101/1k, house price £126k |
| 2011 | Census anchor | Census 2011, crime 96/1k, house price £100k |
| 2016 | Interpolated | Mid-recovery, crime 105/1k, house price £110k |
| 2021 | Census anchor | Census 2021 (SDZ), crime 95/1k, house price £139k |
| 2025 | Current | Crime 92/1k, house price £174k, vacancy 33% |
| 2027 | ML Predicted | 60% weighted linear + 40% Random Forest |
| 2029 | ML Predicted | Same model, with decay acceleration |

### 4.3 ML Prediction Model
- **Training data:** 174 SOAs × 7 periods = 1,218 samples
- **Features:** 4 pillar scores, NIMDM ranks (MDM, crime), listed buildings count, HARNI count, year, lag UDI
- **Model:** Random Forest Regressor (200 trees, max depth 8)
- **Blending:** 60% weighted linear trend (recent years 10× weight) + 40% RF
- **Post-processing:** Spatial smoothing (80% own + 20% 3-nearest neighbours), momentum constraint for worsening SOAs, decay acceleration (+0.4%/yr base, +0.27%/yr for SOAs >0.45)

### 4.4 Colour Thresholds
| Colour | UDI Range | Label |
|--------|-----------|-------|
| Green | < 0.20 | Nominal |
| Yellow-Green | < 0.30 | Low |
| Yellow | < 0.42 | Moderate |
| Orange | < 0.55 | Elevated |
| Red | < 0.66 | High |
| Dark Red | ≥ 0.66 | Severe |

---

## 5. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React + Vite)                    │
│                                                                  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────┐ │
│  │ Sidebar  │  │   MapView    │  │ Insights  │  │  Timeline  │ │
│  │ - Layers │  │ (MapLibre +  │  │  Panel    │  │  (Bottom)  │ │
│  │ - Info   │  │  deck.gl)    │  │ (Right)   │  │            │ │
│  │ - Toggle │  │              │  │           │  │            │ │
│  └──────────┘  └──────┬───────┘  └───────────┘  └────────────┘ │
│                       │                                          │
│              ┌────────┴────────┐                                 │
│              │   Layer Stack   │                                 │
│              │                 │                                 │
│              │  UDI Overlay    │◄── belfast-udi.json (174 SOAs)  │
│              │  3D Buildings   │◄── belfast-buildings.json       │
│              │  Companies      │◄── belfast-buildings.json       │
│              │  Bus Stops      │◄── belfast-bus-stops.json       │
│              │  Flood Risk     │◄── belfast-coast.json           │
│              │  Power Grid     │◄── ni-grid.json                 │
│              │  Traffic        │◄── TomTom API (live)            │
│              │  Data Centres   │◄── (computed)                   │
│              └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    DATA PIPELINE (Python)                         │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                  Raw Data Sources                        │    │
│  │                                                          │    │
│  │  NISRA Census ──┐                                        │    │
│  │  NISRA NIMDM ───┤                                        │    │
│  │  PSNI Crime ────┤    ┌──────────────┐                    │    │
│  │  DfC Heritage ──┼───►│ 10_compute   │──► belfast-udi.json│    │
│  │  LPS Housing ───┤    │   _udi.py    │    (174 SOAs ×     │    │
│  │  OpenDataNI ────┤    └──────────────┘     9 periods)     │    │
│  │  Translink ─────┘           │                            │    │
│  │                             ▼                            │    │
│  │                    ┌──────────────┐                      │    │
│  │                    │ 11_predict   │──► 2027/2029 scores  │    │
│  │                    │   _udi.py    │   (appended to JSON) │    │
│  │                    │ (sklearn RF) │                      │    │
│  │                    └──────────────┘                      │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Topological Layer Stack

Layers render in this order (bottom to top):

```
Layer 8: Company Labels (TextLayer)        ── violet, zoom ≥15 only
Layer 7: Company Highlights (GeoJsonLayer) ── violet extruded polygons
Layer 6: Bus Stops (ScatterplotLayer)      ── amber dots, 2,013 stops
Layer 5: Traffic (ScatterplotLayer)        ── green animated dots
Layer 4: Data Centres (ColumnLayer)        ── purple columns
Layer 3: Power Grid (GeoJsonLayer ×2)     ── yellow lines + substations
Layer 2: Flood Risk (GeoJsonLayer ×3)     ── sea blue fill + 2 ripple strokes
Layer 1: UDI Overlay (GeoJsonLayer)       ── green→red gradient, 174 SOAs
Layer 0: 3D Buildings (GeoJsonLayer)      ── blue-grey extruded, 125k buildings
─────────────────────────────────────────
Base:    MapLibre GL (CARTO Dark/Light or MapTiler Satellite)
```

---

## 7. File Structure

```
belfast-3d/
├── public/
│   ├── belfast-udi.json          # UDI scores (174 SOAs × 9 periods)
│   ├── belfast-buildings.json    # 125,100 building footprints
│   ├── belfast-bus-stops.json    # 2,013 Translink bus stops
│   ├── belfast-coast.json        # Flood risk zones
│   ├── belfast-rivers.json       # River geometries
│   ├── belfast-roads.json        # Road network
│   └── ni-grid.json              # Power grid
├── src/
│   ├── App.jsx                   # Main app, state management
│   ├── components/
│   │   ├── MapView.jsx           # Map + all deck.gl layers
│   │   ├── Sidebar.jsx           # Collapsible left panel
│   │   ├── LayerPanel.jsx        # Layer toggles + day/night
│   │   ├── InfoPanel.jsx         # Click-to-inspect (in sidebar)
│   │   ├── UDITimeline.jsx       # Bottom timeline bar
│   │   ├── InsightsPanel.jsx     # Right-side period insights
│   │   ├── DetailModal.jsx       # Full-screen recommendation modal
│   │   └── Legend.jsx            # (disabled)
│   ├── hooks/
│   │   ├── useBuildingData.js    # Buildings + year filtering
│   │   ├── useUDIData.js         # UDI GeoJSON + period selection
│   │   ├── useCompanyData.js     # Top 50 companies + year filtering
│   │   ├── useTransitData.js     # Bus stops
│   │   ├── useFloodData.js       # Flood risk zones
│   │   ├── useGridData.js        # Power grid
│   │   ├── useTrafficData.js     # TomTom live traffic
│   │   ├── useDataCentreData.js  # Data centre sites
│   │   └── useDecayData.js       # (legacy ward-level decay)
│   └── data/
│       └── buildingYears.js      # ~90 notable buildings with construction years

belfast-udi-data/
├── scripts/
│   ├── 01_fetch_soa_boundaries.py
│   ├── 02_fetch_census.py
│   ├── 03_fetch_crime.py
│   ├── 04_fetch_harni.py
│   ├── 05_fetch_housing.py
│   ├── 06_fetch_nimdm.py
│   ├── 10_compute_udi.py         # Main UDI scoring engine
│   ├── 11_predict_udi.py         # ML prediction (2027/2029)
│   └── 99_check_sufficiency.py
├── data/
│   ├── clean/                    # 13 processed datasets
│   └── raw/                      # Cached downloads
└── SUFFICIENCY.md
```

---

## 8. Key Findings

| Metric | 2001 | 2011 | 2025 | 2029 (pred) |
|--------|------|------|------|-------------|
| Mean UDI | 0.459 | 0.430 | 0.402 | 0.427 |
| Belfast crime/1k | 143 | 96 | 92 | — |
| Avg house price | £85k | £100k | £174k | — |
| Avg rent/mo | £350 | £450 | £875 | — |
| Vacancy rate | ~22% | ~24% | 33% | ~38% (est) |
| Worst SOA | Duncairn 1 | Duncairn 1 | Duncairn 1 | Duncairn 1 |

---

*Report generated April 2026. Data sources are publicly available from NISRA, PSNI, OpenDataNI, and ONS.*
