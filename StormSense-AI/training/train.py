import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader

from model import StormSenseModel


# -----------------------------
# Configuration
# -----------------------------

DATA_FILE = "data/processed/normalized_sequences.npz"

BATCH_SIZE = 4
EPOCHS = 15
LEARNING_RATE = 0.0005

DEVICE = torch.device("cpu")

print("Using device:", DEVICE)


# -----------------------------
# Load data
# -----------------------------

data = np.load(DATA_FILE)

X = data["X"]
Y = data["Y"]

print("X:", X.shape)
print("Y:", Y.shape)


# -----------------------------
# Convert to tensors
# -----------------------------

X = torch.tensor(X, dtype=torch.float32)
Y = torch.tensor(Y, dtype=torch.float32)


# -----------------------------
# Train / validation split
# -----------------------------

split = int(len(X) * 0.8)

X_train = X[:split]
Y_train = Y[:split]

X_val = X[split:]
Y_val = Y[split:]

print("Training samples:", len(X_train))
print("Validation samples:", len(X_val))


# -----------------------------
# Data loaders
# -----------------------------

train_dataset = TensorDataset(X_train, Y_train)
val_dataset = TensorDataset(X_val, Y_val)

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False
)


# -----------------------------
# Model
# -----------------------------

model = StormSenseModel().to(DEVICE)


# -----------------------------
# Loss
# -----------------------------

# The severe-weather pixels are extremely rare.
# Instead of using the previous ~1028 weight,
# use a controlled weight to prevent the model
# from predicting almost everything as severe.

POS_WEIGHT = 20.0

pos_weight = torch.tensor(
    POS_WEIGHT,
    dtype=torch.float32,
    device=DEVICE
)

criterion = nn.BCEWithLogitsLoss(
    pos_weight=pos_weight
)


# -----------------------------
# Optimizer
# -----------------------------

optimizer = torch.optim.Adam(
    model.parameters(),
    lr=LEARNING_RATE
)


# -----------------------------
# Training
# -----------------------------

for epoch in range(EPOCHS):

    model.train()

    total_loss = 0.0

    for batch_X, batch_Y in train_loader:

        batch_X = batch_X.to(DEVICE)
        batch_Y = batch_Y.to(DEVICE)

        optimizer.zero_grad()

        predictions = model(batch_X)

        loss = criterion(
            predictions,
            batch_Y
        )

        loss.backward()

        optimizer.step()

        total_loss += loss.item()

    average_loss = total_loss / len(train_loader)


    # -------------------------
    # Validation
    # -------------------------

    model.eval()

    validation_loss = 0.0

    with torch.no_grad():

        for batch_X, batch_Y in val_loader:

            batch_X = batch_X.to(DEVICE)
            batch_Y = batch_Y.to(DEVICE)

            predictions = model(batch_X)

            loss = criterion(
                predictions,
                batch_Y
            )

            validation_loss += loss.item()

    validation_loss /= len(val_loader)


    print(
        f"Epoch {epoch + 1}/{EPOCHS} "
        f"| Train Loss: {average_loss:.4f} "
        f"| Validation Loss: {validation_loss:.4f}"
    )


# -----------------------------
# Save model
# -----------------------------

import os

os.makedirs("models", exist_ok=True)

torch.save(
    model.state_dict(),
    "models/stormsense_model.pth"
)

print()
print("TRAINING COMPLETE")
print("Model saved to:")
print("models/stormsense_model.pth")