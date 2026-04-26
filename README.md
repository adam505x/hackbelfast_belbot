# DecayDelay — City Intelligence Platform

Interactive 3D map of Belfast with four intelligence layers that cross-reference each other to find optimal development sites.

## Layers

- 🌊 **Flood Risk** — DfI Rivers APSFR/TAPSFR zones, 2017 flood event data, sea level rise simulator
- ⚡ **Power Grid** — 539 substations + 318 power lines from OSM (275kV/110kV/33kV/11kV)
- 🖥️ **Data Centres** — 6 verified NI facilities (BT, Atlas, Microsoft, Prescient, Xperience)
- 🏚️ **Urban Decay** — NISRA NIMDM 2017 ward-level deprivation with real boundary polygons
- 🏢 **3D Buildings** — 125k extruded buildings across all of Belfast

## Quick Start

### Frontend

```bash
cd belfast-3d
npm install
npm run dev
```

Open http://localhost:5173

### Backend (optional — enables AI chat + scoring engine)

```bash
cd belfast-3d/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your ANTHROPIC_API_KEY for Claude-powered responses
uvicorn main:app --port 8000 --reload
```

## Tech Stack

- **3D Map**: Deck.gl + MapLibre GL JS
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Python FastAPI + ChromaDB (RAG) + scikit-learn
- **Data**: DfI NI ArcGIS, OSM Overpass, NISRA NIMDM 2017

## Data Sources

- DfI Rivers Floods Directive 2nd Cycle (ArcGIS REST)
- OpenStreetMap buildings, power grid, data centres
- NISRA NI Multiple Deprivation Measure 2017
- NI ward boundaries (martinjc/UK-GeoJSON)
