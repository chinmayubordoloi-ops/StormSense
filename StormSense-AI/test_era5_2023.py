import cdsapi
from pathlib import Path

client = cdsapi.Client()

output = Path("data/raw/historical/era5_2023_01.nc")

request = {
    "product_type": ["reanalysis"],
    "variable": [
        "10m_u_component_of_wind",
        "10m_v_component_of_wind",
        "2m_dewpoint_temperature",
        "2m_temperature",
        "surface_pressure",
        "total_precipitation",
        "total_column_water_vapour"
    ],
    "year": ["2023"],
    "month": ["01"],
    "day": [
        "01", "02", "03", "04", "05",
        "06", "07", "08", "09", "10",
        "11", "12", "13", "14", "15",
        "16", "17", "18", "19", "20",
        "21", "22", "23", "24", "25",
        "26", "27", "28", "29", "30",
        "31"
    ],
    "time": [
        "00:00", "01:00", "02:00", "03:00",
        "04:00", "05:00", "06:00", "07:00",
        "08:00", "09:00", "10:00", "11:00",
        "12:00", "13:00", "14:00", "15:00",
        "16:00", "17:00", "18:00", "19:00",
        "20:00", "21:00", "22:00", "23:00"
    ],
    "data_format": "netcdf",
    "download_format": "unarchived",
    "area": [28, 89, 24, 96]
}

print("Downloading January 2023...")

client.retrieve(
    "reanalysis-era5-single-levels",
    request,
    str(output)
)

print("DOWNLOAD COMPLETE")
print(output)