import cdsapi
import os

output_dir = r"D:\StormSense\StormSense-AI\data\raw"
os.makedirs(output_dir, exist_ok=True)

client = cdsapi.Client()

dataset = "reanalysis-era5-single-levels"

variables = [
    "10m_u_component_of_wind",
    "10m_v_component_of_wind",
    "2m_dewpoint_temperature",
    "2m_temperature",
    "surface_pressure",
    "total_precipitation",
    "total_column_water_vapour"
]

days_by_month = {
    "01": [f"{d:02d}" for d in range(1, 32)],
    "02": [f"{d:02d}" for d in range(1, 30)],  # 2024 is leap year
    "03": [f"{d:02d}" for d in range(1, 32)]
}

times = [f"{h:02d}:00" for h in range(24)]

for month, days in days_by_month.items():

    target = os.path.join(
        output_dir,
        f"era5_2024_{month}.nc"
    )

    print(f"\nDownloading month: {month}")
    print(f"Saving to: {target}")

    request = {
        "product_type": ["reanalysis"],
        "variable": variables,
        "year": ["2024"],
        "month": [month],
        "day": days,
        "time": times,
        "data_format": "netcdf",
        "download_format": "unarchived",
        "area": [28, 89, 24, 96]
    }

    client.retrieve(dataset, request, target)

    print(f"Completed: {target}")

print("\nALL ERA5 DOWNLOADS COMPLETED!")