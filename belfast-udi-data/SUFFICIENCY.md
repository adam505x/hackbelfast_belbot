# Belfast UDI — Data Sufficiency Report

Generated: 2026-04-25 22:10

## Source Summary

| Status | Source | Rows/Features | Coverage | File | Notes |
|--------|--------|---------------|----------|------|-------|
| ✅ | SOA Boundaries | 174 | 100% | `data/clean/soa_boundaries_belfast.geojson` | 174 polygons, all Belfast LGD |
| ✅ | Census 2021 | 350 | 100% | `data/clean/census_2021_belfast.csv` | 350 rows at SDZ level |
| ⚠️ | Census 2011 | 150 | 86% | `data/clean/census_2011_belfast.csv` | 150 rows at SOA level |
| ⚠️ | Census 2001 | 150 | 100% | `data/clean/census_2001_belfast.csv` | 150 rows (ward-level, not SOA — expected) |
| ✅ | Crime (PSNI) | 207,773 | 100% | `data/clean/crime_belfast.csv` | 207773 records, 55 months | Range: 2021-08-01 00:00:00 to 2026-02-01 00:00:00 |
| ✅ | Listed Buildings | 2,347 | 100% | `data/clean/listed_buildings_belfast.geojson` | 2347 features in Belfast |
| ✅ | Heritage at Risk | 1,062 | 100% | `data/clean/harni_belfast.geojson` | 1062 features in Belfast |
| ✅ | Housing (NI HPI) | 3,667 | 100% | `data/clean/housing_belfast.csv` | 3667 rows from NI House Price Index (LGD/ward level, 2005-2025) |
| ✅ | NIMDM 2017 | 174 | 100% | `data/clean/nimdm_belfast.csv` | 174 SOAs with deprivation ranks (100% coverage) |

## UDI Pillar Coverage

| Pillar | Status | Sources |
|--------|--------|---------|
| Demographic | ✅ | Census 2021 (SDZ), NIMDM 2017 |
| Crime | ✅ | PSNI street-level crime |
| Dereliction | ✅ | Historic Buildings Record, Industrial Heritage Record |
| Housing | ✅ | NI House Price Index (LPS/DoF) |

## Go/No-Go

**GO** — All four UDI pillars (demographic, crime, dereliction, housing) have sufficient data to proceed to the scoring phase.

## Caveats

- Census 2021 uses Super Data Zones (SDZ), not SOAs. SDZ→SOA best-fit mapping will be needed in the scoring phase.
- Census 2011 standalone data was not available via API. NIMDM 2017 contains 2011-era deprivation indicators as a proxy.
- Census 2001 is ward-level only (SOAs were introduced for Census 2011). Ward-to-SOA interpolation will be needed in the scoring phase.
- Crime data from data.police.uk has no records before ~2010. 2001 crime baseline is unavailable — this is expected.
- Housing data is from NI House Price Index (LPS/DoF), not UK Land Registry (which only covers England & Wales). Data is at LGD/ward level, not individual transactions.
- Heritage data uses Historic Buildings Record and Industrial Heritage Record from DfC/HED as dereliction proxies.
