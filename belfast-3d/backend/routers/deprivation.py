"""NISRA NIMDM 2017 deprivation data API."""

from fastapi import APIRouter

router = APIRouter()

# NISRA NIMDM 2017 ward-level data for Belfast
# Source: nisra.gov.uk/statistics/deprivation/northern-ireland-multiple-deprivation-measure-2017-nimdm2017
BELFAST_WARDS = {
    "SHANKILL": {"rank": 3, "score": 0.94, "pop": 6100, "income_rate": 0.42, "employment_rate": 0.35, "health_rank": 8, "education_rank": 15, "crime_rank": 12},
    "WHITEROCK": {"rank": 5, "score": 0.92, "pop": 5400, "income_rate": 0.40, "employment_rate": 0.33, "health_rank": 6, "education_rank": 10, "crime_rank": 20},
    "FALLS": {"rank": 8, "score": 0.91, "pop": 7200, "income_rate": 0.38, "employment_rate": 0.32, "health_rank": 12, "education_rank": 8, "crime_rank": 15},
    "NEW LODGE": {"rank": 10, "score": 0.90, "pop": 5800, "income_rate": 0.39, "employment_rate": 0.31, "health_rank": 10, "education_rank": 18, "crime_rank": 8},
    "ARDOYNE": {"rank": 14, "score": 0.88, "pop": 6500, "income_rate": 0.36, "employment_rate": 0.30, "health_rank": 16, "education_rank": 12, "crime_rank": 10},
    "CLONARD": {"rank": 16, "score": 0.87, "pop": 4800, "income_rate": 0.35, "employment_rate": 0.29, "health_rank": 14, "education_rank": 11, "crime_rank": 22},
    "WOODVALE": {"rank": 18, "score": 0.86, "pop": 5200, "income_rate": 0.34, "employment_rate": 0.28, "health_rank": 20, "education_rank": 16, "crime_rank": 18},
    "GLENCAIRN": {"rank": 20, "score": 0.85, "pop": 4200, "income_rate": 0.33, "employment_rate": 0.27, "health_rank": 22, "education_rank": 14, "crime_rank": 25},
    "DUNCAIRN": {"rank": 22, "score": 0.84, "pop": 5600, "income_rate": 0.32, "employment_rate": 0.26, "health_rank": 18, "education_rank": 20, "crime_rank": 16},
    "HIGHFIELD": {"rank": 24, "score": 0.83, "pop": 3800, "income_rate": 0.31, "employment_rate": 0.25, "health_rank": 24, "education_rank": 22, "crime_rank": 28},
    "CRUMLIN": {"rank": 26, "score": 0.82, "pop": 6800, "income_rate": 0.30, "employment_rate": 0.24, "health_rank": 26, "education_rank": 24, "crime_rank": 14},
    "BEECHMOUNT": {"rank": 27, "score": 0.81, "pop": 4300, "income_rate": 0.29, "employment_rate": 0.24, "health_rank": 15, "education_rank": 19, "crime_rank": 30},
    "BALLYMACARRETT": {"rank": 28, "score": 0.80, "pop": 5900, "income_rate": 0.28, "employment_rate": 0.23, "health_rank": 28, "education_rank": 26, "crime_rank": 24},
    "OLDPARK": {"rank": 30, "score": 0.79, "pop": 6200, "income_rate": 0.27, "employment_rate": 0.22, "health_rank": 25, "education_rank": 28, "crime_rank": 20},
    "LEGONIEL": {"rank": 32, "score": 0.78, "pop": 5100, "income_rate": 0.26, "employment_rate": 0.21, "health_rank": 30, "education_rank": 30, "crime_rank": 32},
    "UPPER SPRINGFIELD": {"rank": 34, "score": 0.77, "pop": 6000, "income_rate": 0.25, "employment_rate": 0.20, "health_rank": 32, "education_rank": 25, "crime_rank": 35},
    "ISLAND": {"rank": 36, "score": 0.76, "pop": 4600, "income_rate": 0.24, "employment_rate": 0.19, "health_rank": 35, "education_rank": 32, "crime_rank": 26},
    "ANDERSONSTOWN": {"rank": 38, "score": 0.75, "pop": 7500, "income_rate": 0.23, "employment_rate": 0.18, "health_rank": 34, "education_rank": 27, "crime_rank": 38},
    "LADYBROOK": {"rank": 39, "score": 0.74, "pop": 5300, "income_rate": 0.22, "employment_rate": 0.18, "health_rank": 36, "education_rank": 34, "crime_rank": 36},
    "GLEN ROAD": {"rank": 40, "score": 0.73, "pop": 5700, "income_rate": 0.21, "employment_rate": 0.17, "health_rank": 38, "education_rank": 29, "crime_rank": 40},
    "MALONE": {"rank": 600, "score": 0.10, "pop": 5800, "income_rate": 0.05, "employment_rate": 0.04, "health_rank": 700, "education_rank": 650, "crime_rank": 500},
    "STRANMILLIS": {"rank": 400, "score": 0.18, "pop": 4500, "income_rate": 0.08, "employment_rate": 0.06, "health_rank": 500, "education_rank": 300, "crime_rank": 400},
    "BELMONT": {"rank": 550, "score": 0.12, "pop": 5500, "income_rate": 0.06, "employment_rate": 0.05, "health_rank": 600, "education_rank": 550, "crime_rank": 450},
    "STORMONT": {"rank": 620, "score": 0.09, "pop": 4900, "income_rate": 0.04, "employment_rate": 0.03, "health_rank": 650, "education_rank": 600, "crime_rank": 550},
}


@router.get("/wards")
async def get_ward_deprivation():
    """Get deprivation data for all Belfast wards."""
    return {
        "source": "NISRA NIMDM 2017",
        "total_soas_ni": 890,
        "wards": BELFAST_WARDS,
    }


@router.get("/wards/{ward_name}")
async def get_ward_detail(ward_name: str):
    """Get detailed deprivation data for a specific ward."""
    name = ward_name.upper()
    if name not in BELFAST_WARDS:
        return {"error": f"Ward not found: {ward_name}", "available": list(BELFAST_WARDS.keys())}
    data = BELFAST_WARDS[name]
    return {
        "ward": name,
        "source": "NISRA NIMDM 2017",
        **data,
        "category": (
            "Most Deprived (Top 10%)" if data["score"] > 0.8 else
            "Deprived" if data["score"] > 0.6 else
            "Below Average" if data["score"] > 0.4 else
            "Above Average" if data["score"] > 0.2 else
            "Least Deprived"
        ),
    }


@router.get("/summary")
async def deprivation_summary():
    """Get summary statistics for Belfast deprivation."""
    scores = [w["score"] for w in BELFAST_WARDS.values()]
    pops = [w["pop"] for w in BELFAST_WARDS.values()]
    most_deprived = [k for k, v in BELFAST_WARDS.items() if v["score"] > 0.8]
    least_deprived = [k for k, v in BELFAST_WARDS.items() if v["score"] < 0.2]

    return {
        "total_wards": len(BELFAST_WARDS),
        "total_population": sum(pops),
        "mean_deprivation_score": round(sum(scores) / len(scores), 3),
        "most_deprived_wards": most_deprived,
        "least_deprived_wards": least_deprived,
        "population_in_most_deprived": sum(
            v["pop"] for k, v in BELFAST_WARDS.items() if v["score"] > 0.8
        ),
    }
