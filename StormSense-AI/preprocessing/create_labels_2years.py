import xarray as xr
from pathlib import Path

INPUT = "data/processed/era5_2023_2024_full.nc"
OUTPUT = "data/processed/training_labels_2years.nc"

ds = xr.open_dataset(INPUT)

# Convert precipitation from metres to millimetres
rain_mm = ds["tp"] * 1000.0

# Prototype heavy-rain threshold
threshold = 10.0

labels = {}

for hours in range(2, 7):

    future_rain = rain_mm.shift(
        valid_time=-hours
    )

    labels[f"heavy_rain_{hours}h"] = (
        future_rain >= threshold
    ).astype("int8")

label_ds = xr.Dataset(labels)

# Remove final 6 hours because future observations don't exist
label_ds = label_ds.isel(
    valid_time=slice(0, -6)
)

Path("data/processed").mkdir(
    parents=True,
    exist_ok=True
)

label_ds.to_netcdf(OUTPUT)

print("2-YEAR LABEL CREATION COMPLETE")
print(label_ds)
print()
print("Variables:")
print(list(label_ds.data_vars))

ds.close()