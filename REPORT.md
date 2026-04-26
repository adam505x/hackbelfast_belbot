# DecayDelay — Urban Decay Intelligence Platform
## Full Technical Report

---


**Frontend Architecture:**

State management (App.jsx) is entirely local React state — no Redux, no Context API. The layer toggle object (INITIAL_LAYERS) is the single source of truth, passed as props down to both MapView (for rendering) and LayerPanel (for controls). The sea level rise value (seaLevelRise: 0–5m) and UDI period ('2001'–'2029') are also state at the root and flow down to the relevant hooks and components.

**Map rendering uses a two-layer stack:**

react-map-gl/maplibre renders the vector basemap MapboxOverlay from mounts Deck.gl into MapLibre's canvas via a useControl hook. All Deck.gl layers are computed in a single useMemo in MapView.jsx and rebuilt whenever any dependency is mutated. The order of result.push(...) calls controls draw order buildings first, UDI overlay second so it's on top for click-picking, then flood, grid, etc ensuring we have our assests being loaded in correctly and quickly post mutation despite having heavy 3 surfaces being rendered

Data loading pattern is consistent across all hooks useEffect with a cancellation flag triggers a fetch() on mount, sets the raw state and a second useMemo transforms the raw data into the Deck.gl ready format. This means transformations are not repeated on re-renders, only when the raw data or a key parameter is mutated

**Flood Layer Computed Geometry:**

The flood data is not fetched as polygons it is computed client-side from river coordinate arrays. useFloodData.js fetches belfast-rivers.json (which stores river centerlines as coordinate arrays indexed by river name) and then:

we slice each river by index range to get the relevant segment and then we buffer each line into a polygon using bufferLine for each point we then compute the unit normal to the tangent vector, offsets left and right by width + seaLevelRise * 0.0003, concatenates left + reversed right ring and then we scale the buffer width with sea level rise so zones visually expand. To compute effective risk if seaLevelRise > zone.base, the zone upgrades to 'high' risk

The live DfI ArcGIS REST call (fetchAPSFRStats) only fetches statistics (settlement name, high-probability property count, annual average damage) to populate click-panel data not the geometries themselves

**Traffic Simulation:**
The traffic layer is a particle simulation not a heatmap. Implementation in useTrafficData.js. Heatmap is useful for visulization but seems unhelpful in practicality. It felt clunky messed with the fludity of the city I was looking for

To load the different roads at once we load belfast-roads.json which are the compact road segments:
We then buildt a junction index mapping endpoint coordinates to connected road segments used for vehicle routing at intersections, ran into issues here with cars constantly going out of bounds so this required a bit of tuningjust because since the roads were slices and often these slices would overhang into space they were not meant to out into eachother

We then used the TomTom Flow API for a 5×4 grid of sample points across Belfast, gets currentSpeed/freeFlowSpeed for each, builds a congestion lookup function (nearest-segment spatial search)
Spawns 1,200 vehicle objects, each tracking {roadIdx, forward, seg, t, speed, congestion} and synced this using their traffic report for befast for the day, it is hard to simulate individual cars working in the grid but it is not difficult to have cars appromimate the pattern observed from the pulled traffic data, cut down API calls rendering cars around the clusters and simulating activity then wasting time looking for satellite tracking just to add semi-accurate moving cars

setInterval(tick, 50ms) allows us to move every vehicle and increments the cars on the map by speed / segmentLength, rolls to next segment when t >= 1, navigates junctions by picking the correct connecting road towards the cluster the car is assigned to excluding the road just traveled breadcrumb avoidance, we want to make it look natural to the user
At road ends with no exit: resetVehicle() respawns elsewhere close to the cluster
Every 60s: re-fetches TomTom, updates congestion on all vehicles in-place
Vehicle speed is converted: km/h → degrees/second → degrees/tick, scaled for visual legibility on screen.

**Scoring Engine:**
Implements five sub scores for multiple different assests visible on the map reflecting different core external weights that would have or could influence the deprivation improvement or worsening in a over in the future. These are filters enabled from the popout on the left side of the screen and serve as a tool for the user to better understand the data

calc_flood_safety: This is for the flood areas that could be at risk and has 6 hardcoded flood zone centroids, computes haversine_approx distance, if within zone.radius * 111.32 km computes overlap factor (1 - dist/radius), scales by zone risk. Returns 1.0 - max_risk.
calc_grid_proximity: This is for the power grid and it iterates 9 substations, computes distance, scores as exp(-dist/1.5) * (0.4 + 0.6 * voltage_weight). The 1.5 km decay constant means score halves roughly every ~1km. Takes the maximum across all substations.
calc_fibre_access: Straight line distance to city centre and harbour, exp(-best/2.0). This exists but we never ended up using or tuning it since became irrellavent
Land availability: Lookup table {derelict: 0.9, brownfield: 0.85, industrial: 0.7, greenfield: 0.3, unknown: 0.5}.
Deprivation bonus: min(1.0, deprivation_score * 1.2) — slightly amplified to give deprived areas a stronger incentive signal so they can be picked up by our thresholds and have a more intuitave graphic
Composite = 0.30*flood + 0.25*grid + 0.15*fibre + 0.15*land + 0.15*deprivation. The /batch endpoint calls /score in a loop and sorts by composite descending

**UDI Data Pipeline:**
Input data sources by running provided scripts, will pull from NIE sources and clean/normalize everything

soa_boundaries_belfast.geojson: 174 SOA polygons from NISRA shapefile reprojected to EPSG:4326
nimdm_belfast.csv: 174 rows with 8 domain ranks (MDM, Income, Employment, Health, Education, Access, Living Env, Crime) from NIMDM 2017
census_2001_belfast.csv, census_2011_belfast.csv, census_2021_belfast.csv: population counts
crime_belfast.csv: 207,773 PSNI street-level records
harni_belfast.geojson + listed_buildings_belfast.geojson: heritage/dereliction proxies
housing_belfast.csv: NI HPI house prices
Scoring: four pillars per SOA per 7 periods

**Pillar	Weight	Method:**

The idea of this was to find some composite UDI around some fo the core metrics that could affect urban decay, we identified those as the below:

Demographic	0.25: NIMDM health rank as an age proxy; population change between census anchors (NIE dataset '01, '11, '21); interpolated for intermediate years; 60/40 blend pop-change/age-proxy
Crime	0.25: NIMDM crime rank scaled by period_crime_rate / peak_rate (143 per 1k in 2001 = peak)
Dereliction: 0.30	0.50 * harni_count_norm + 0.30 * harni/listed_ratio_norm + 0.20 * total_norm; static 2001–2016, scaled ×1.40 for 2021, ×1.65 for 2025
Housing: 0.20 NIMDM living-environment rank, damped toward 0.5 for earlier periods (0.30×base in 2001 → 1.00×base in 2025)
All per pillar raw values are min-max normalized within each period across all 174 SOAs

The idea of this was to find some composite UDI = 0.30 × demographic + 0.25 × crime + 0.25 × dereliction + 0.20 × housing

That composite number is what determines the colour on the map ranging from the 6 thresholds that are visible to use ranging from Green all the way to red. The individual pillar scores are stored in the GeoJSON so the tooltip can show the breakdown when the user clicks "this SOA is red because crime is 78% but housing is only 35%". These also feed into the Random Forest model as features for the 2027/2029 predictions so we have SOA level analysis as a breakdown


**ML prediction blended model for 2027/2029:**

Linear (60%): Per-SOA weighted linear regression using np.polyfit with sample weights exponentially increasing toward recent years so 2016–2025 drives the extrapolation
Random Forest (40%): RandomForestRegressor trained on all 174×7=1,218 samples; features = [4 pillar scores, mdm_rank/890, crime_rank/890, listed_count, harni_count, year, lag_udi]
Spatial smoothing: 0.80 * own + 0.20 * mean(3-nearest-neighbours) — prevents isolated prediction spikes
Momentum constraint: If udi_2025 - udi_2021 > 0.005, prediction is floored at udi_2025 + dampened_trend to prevent optimistic reversals
Baseline acceleration: +0.004 * years_from_2025 applied universally; +0.0027/yr extra for SOAs with udi_2025 > 0.45
Output is written back into the same belfast-udi.json with udi_2027/udi_2029 keys added per feature.



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
