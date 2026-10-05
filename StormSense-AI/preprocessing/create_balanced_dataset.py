import numpy as np
from pathlib import Path

INPUT = "data/processed/training_sequences.npz"
OUTPUT = "data/processed/balanced_sequences.npz"

data = np.load(INPUT)

X = data["X"]
Y = data["Y"]

print("Original X:", X.shape)
print("Original Y:", Y.shape)

# A sequence is positive if it contains
# at least one severe-weather cell
positive_mask = Y.max(axis=(1, 2, 3)) > 0

positive_indices = np.where(positive_mask)[0]
negative_indices = np.where(~positive_mask)[0]

print("Positive samples:", len(positive_indices))
print("Negative samples:", len(negative_indices))

# Use the same number of negative samples as positive samples
np.random.seed(42)

if len(negative_indices) > len(positive_indices):
    negative_indices = np.random.choice(
        negative_indices,
        size=len(positive_indices),
        replace=False
    )

selected_indices = np.concatenate(
    [positive_indices, negative_indices]
)

# Shuffle the balanced dataset
np.random.shuffle(selected_indices)

X_balanced = X[selected_indices]
Y_balanced = Y[selected_indices]

Path("data/processed").mkdir(
    parents=True,
    exist_ok=True
)

np.savez_compressed(
    OUTPUT,
    X=X_balanced,
    Y=Y_balanced
)

print()
print("BALANCED DATASET CREATED")
print("X shape:", X_balanced.shape)
print("Y shape:", Y_balanced.shape)
print("Saved to:", OUTPUT)