from fastapi import APIRouter

router = APIRouter()

SAMPLE_MANDI_DATA = {
    "Pune": [
        {"commodity": "Tomato", "market": "Pune", "min_price": 1200, "max_price": 1800, "modal_price": 1500, "date": "2026-04-03"},
        {"commodity": "Onion", "market": "Pune", "min_price": 800, "max_price": 1200, "modal_price": 1000, "date": "2026-04-03"},
        {"commodity": "Potato", "market": "Pune", "min_price": 1000, "max_price": 1400, "modal_price": 1200, "date": "2026-04-03"},
        {"commodity": "Wheat", "market": "Pune", "min_price": 2200, "max_price": 2600, "modal_price": 2400, "date": "2026-04-03"},
        {"commodity": "Sugarcane", "market": "Pune", "min_price": 300, "max_price": 400, "modal_price": 350, "date": "2026-04-03"},
    ],
    "Nashik": [
        {"commodity": "Grape", "market": "Nashik", "min_price": 4000, "max_price": 6000, "modal_price": 5000, "date": "2026-04-03"},
        {"commodity": "Onion", "market": "Nashik", "min_price": 900, "max_price": 1300, "modal_price": 1100, "date": "2026-04-03"},
        {"commodity": "Tomato", "market": "Nashik", "min_price": 1100, "max_price": 1700, "modal_price": 1400, "date": "2026-04-03"},
    ],
    "Nagpur": [
        {"commodity": "Orange", "market": "Nagpur", "min_price": 3000, "max_price": 5000, "modal_price": 4000, "date": "2026-04-03"},
        {"commodity": "Cotton", "market": "Nagpur", "min_price": 6000, "max_price": 7000, "modal_price": 6500, "date": "2026-04-03"},
        {"commodity": "Soybean", "market": "Nagpur", "min_price": 4200, "max_price": 4800, "modal_price": 4500, "date": "2026-04-03"},
    ],
    "Ahmednagar": [
        {"commodity": "Sugarcane", "market": "Ahmednagar", "min_price": 280, "max_price": 380, "modal_price": 330, "date": "2026-04-03"},
        {"commodity": "Onion", "market": "Ahmednagar", "min_price": 850, "max_price": 1250, "modal_price": 1050, "date": "2026-04-03"},
        {"commodity": "Maize", "market": "Ahmednagar", "min_price": 1700, "max_price": 2100, "modal_price": 1900, "date": "2026-04-03"},
    ],
    "Kolhapur": [
        {"commodity": "Sugarcane", "market": "Kolhapur", "min_price": 290, "max_price": 390, "modal_price": 340, "date": "2026-04-03"},
        {"commodity": "Turmeric", "market": "Kolhapur", "min_price": 8000, "max_price": 12000, "modal_price": 10000, "date": "2026-04-03"},
    ],
}


@router.get("/mandi-prices")
async def get_mandi_prices(district: str = "Pune"):
    district_title = district.title()
    records = SAMPLE_MANDI_DATA.get(district_title, SAMPLE_MANDI_DATA.get("Pune", []))
    return {
        "records": records,
        "district": district_title,
        "source": "ShetVaidya Sample Dataset",
        "note": "Sample data for demonstration. Real-time prices coming soon.",
    }
