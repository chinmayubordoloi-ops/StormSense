import xarray as xr
from pathlib import Path

BASE = Path("data/raw/historical")
OUTPUT_DIR = Path("data/processed")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

months = []

for year in ["2023", "2024"]:
    for month in range(1, 13):
        months.append(f"{year}_{month:02d}")

datasets = []

for ym in months:

    instant_file = (
        BASE /
        f"era5_{ym}_extracted" /
        "data_stream-oper_stepType-instant.nc"
    )

    accum_file = (
        BASE /
        f"era5_{ym}_extracted" /
        "data_stream-oper_stepType-accum.nc"
    )

    print(f"Processing {ym}...")

    if not instant_file.exists():
        print(f"WARNING: Missing instant file: {instant_file}")
        continue

    if not accum_file.exists():
        print(f"WARNING: Missing accumulated file: {accum_file}")
        continue

    instant = xr.open_dataset(instant_file)
    accum = xr.open_dataset(accum_file)

    # Keep only the variables we need
    instant = instant[
        ["u10", "v10", "d2m", "t2m", "sp", "tcwv"]
    ]

    accum = accum[["tp"]]

    # Combine the two datasets
    combined = xr.merge(
        [instant, accum],
        compat="override"
    )

    datasets.append(combined)

    print(
        f"  OK: {len(combined.valid_time)} hourly records"
    )

print()
print("Combining all months...")

full_dataset = xr.concat(
    datasets,
    dim="valid_time"
)

# Sort chronologically
full_dataset = full_dataset.sortby("valid_time")

# Remove duplicate timestamps if any
_, unique_indices = xr.DataArray(
    full_dataset.valid_time
).to_index().duplicated(keep="first"), None

full_dataset = full_dataset.isel(
    valid_time=~full_dataset.get_index("valid_time").duplicated()
)

output_file = OUTPUT_DIR / "era5_2023_2024_full.nc"

print("Saving...")
full_dataset.to_netcdf(output_file)

print()
print("=" * 60)
print("COMBINATION COMPLETE")
print("=" * 60)
print("Output:", output_file)
print("Dimensions:", full_dataset.sizes)
print("Variables:", list(full_dataset.data_vars))