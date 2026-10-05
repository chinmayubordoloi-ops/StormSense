import numpy as np

INPUT = "data/processed/training_sequences.npz"
OUTPUT = "data/processed/normalized_sequences.npz"

data = np.load(INPUT)

X = data["X"]
Y = data["Y"]

print("Original X:", X.shape)
print("Original Y:", Y.shape)

# Calculate statistics across:
# samples, time, latitude, longitude
mean = X.mean(axis=(0, 1, 2, 3), keepdims=True)
std = X.std(axis=(0, 1, 2, 3), keepdims=True)

# Prevent division by zero
std = np.maximum(std, 1e-6)

# Normalize each weather variable
X_normalized = (X - mean) / std

np.savez_compressed(
    OUTPUT,
    X=X_normalized.astype(np.float32),
    Y=Y
)

# Save statistics for later inference
np.savez(
    "data/processed/normalization_stats.npz",
    mean=mean,
    std=std
)

print()
print("NORMALIZATION COMPLETE")
print("Normalized X:", X_normalized.shape)
print("Normalized min:", X_normalized.min())
print("Normalized max:", X_normalized.max())
print("Normalized mean:", X_normalized.mean())
print("Normalized std:", X_normalized.std())
print()
print("Saved:")
print(OUTPUT)
print("data/processed/normalization_stats.npz")