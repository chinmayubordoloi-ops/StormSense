import xarray as xr
import numpy as np
from pathlib import Path

INPUT = "data/processed/era5_2024_Jan_Mar.nc"
OUTPUT = "data/processed/training_labels.nc"

# Load dataset
ds = xr.open_dataset(INPUT, engine="netcdf4")

# ERA5 total precipitation is metres.
# Convert to millimetres.
rain_mm = ds["tp"] * 1000.0

# Prototype threshold:
# heavy precipitation >= 10 mm/hour
threshold = 10.0

labels = {}

for hours in range(2, 7):
    future_rain = rain_mm.shift(valid_time=-hours)

    labels[f"heavy_rain_{hours}h"] = (
        future_rain >= threshold
    ).astype("int8")

# Combine labels
label_ds = xr.Dataset(labels)

# Remove final 6 hours where future observations don't exist
label_ds = label_ds.isel(valid_time=slice(0, -6))

# Save
Path("data/processed").mkdir(parents=True, exist_ok=True)

label_ds.to_netcdf(OUTPUT)

print("LABEL CREATION COMPLETE")
print(label_ds)
print()
print("Variables:")
print(list(label_ds.data_vars))