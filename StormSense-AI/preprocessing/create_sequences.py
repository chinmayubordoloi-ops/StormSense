import xarray as xr
import numpy as np
from pathlib import Path

INPUT = "data/processed/era5_2023_2024_full.nc"
LABELS = "data/processed/training_labels_2years.nc"
OUTPUT = "data/processed/training_sequences_2years.npz"

ds = xr.open_dataset(INPUT, engine="netcdf4")
labels = xr.open_dataset(LABELS, engine="netcdf4")

features = ["u10", "v10", "d2m", "t2m", "sp", "tcwv", "tp"]

# Convert to NumPy
X_data = np.stack(
    [ds[v].values for v in features],
    axis=-1
)

Y_data = np.stack(
    [
        labels[f"heavy_rain_{h}h"].values
        for h in range(2, 7)
    ],
    axis=-1
)

history = 6

X = []
Y = []

# Each sample:
# X = previous 6 hours
# Y = heavy rain probability targets at +2 to +6 hours

for t in range(history, len(X_data)):

    # Don't create samples where labels don't exist
    if t >= len(Y_data):
        break

    x_sample = X_data[t-history:t]

    y_sample = Y_data[t]

    X.append(x_sample)
    Y.append(y_sample)

X = np.asarray(X, dtype=np.float32)
Y = np.asarray(Y, dtype=np.int8)

Path("data/processed").mkdir(parents=True, exist_ok=True)

np.savez_compressed(
    OUTPUT,
    X=X,
    Y=Y
)

print("SEQUENCE CREATION COMPLETE")
print("X shape:", X.shape)
print("Y shape:", Y.shape)
print("Features:", features)