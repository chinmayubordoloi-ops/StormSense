import xarray as xr
from pathlib import Path

months = ["01", "02", "03"]

datasets = []

for month in months:
    folder = Path(f"data/raw/era5_2024_{month}_extracted")

    instant_file = folder / "data_stream-oper_stepType-instant.nc"
    accum_file = folder / "data_stream-oper_stepType-accum.nc"

    print(f"Loading month {month}...")

    instant = xr.open_dataset(instant_file, engine="netcdf4")
    accum = xr.open_dataset(accum_file, engine="netcdf4")

    # Keep required variables
    instant = instant[["u10", "v10", "d2m", "t2m", "sp", "tcwv"]]
    accum = accum[["tp"]]

    # Combine variables
    ds = xr.merge([instant, accum])

    datasets.append(ds)

    print(f"Month {month} loaded.")

print("Combining January, February and March...")

combined = xr.concat(datasets, dim="valid_time")

# Sort by time
combined = combined.sortby("valid_time")

output = Path("data/processed")
output.mkdir(parents=True, exist_ok=True)

output_file = output / "era5_2024_Jan_Mar.nc"

combined.to_netcdf(output_file)

print()
print("SUCCESS!")
print(f"Saved to: {output_file}")
print(combined)
print()
print("Variables:")
print(list(combined.data_vars))