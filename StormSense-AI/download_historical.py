import cdsapi
from pathlib import Path
import zipfile
import shutil

client = cdsapi.Client()

BASE = Path("data/raw/historical")
BASE.mkdir(parents=True, exist_ok=True)

variables = [
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "2m_dewpoint_temperature",
    "2m_temperature",
    "surface_pressure",
    "total_precipitation",
    "total_column_water_vapour",
]

times = [f"{h:02d}:00" for h in range(24)]

months = [
    ("2023", f"{m:02d}") for m in range(2, 13)
] + [
    ("2024", f"{m:02d}") for m in range(1, 13)
]

for year, month in months:

    zip_file = BASE / f"era5_{year}_{month}.zip"
    extract_dir = BASE / f"era5_{year}_{month}_extracted"

    if extract_dir.exists():
        print(f"Already extracted: {year}-{month}")
        continue

    if month == "02":
        days = 29 if year == "2024" else 28
    elif month in ["04", "06", "09", "11"]:
        days = 30
    else:
        days = 31

    day_list = [f"{d:02d}" for d in range(1, days + 1)]

    request = {
        "product_type": ["reanalysis"],
        "variable": variables,
        "year": [year],
        "month": [month],
        "day": day_list,
        "time": times,
        "data_format": "netcdf",
        "download_format": "unarchived",
        "area": [28, 89, 24, 96],
    }

    print()
    print("=" * 60)
    print(f"DOWNLOADING ERA5 {year}-{month}")
    print("=" * 60)

    client.retrieve(
        "reanalysis-era5-single-levels",
        request,
        str(zip_file)
    )

    print("Download complete.")

    # CDS may return a ZIP even when NetCDF was requested.
    print("Extracting...")

    extract_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_file, "r") as z:
        z.extractall(extract_dir)

    print(f"Extracted to: {extract_dir}")

print()
print("=" * 60)
print("ALL REQUESTED DOWNLOADS COMPLETE")
print("=" * 60)