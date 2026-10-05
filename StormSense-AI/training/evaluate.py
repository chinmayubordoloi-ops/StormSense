import numpy as np
import torch
from sklearn.metrics import precision_score, recall_score, f1_score

from model import StormSenseModel


DATA_FILE = "data/processed/training_sequences.npz"
MODEL_FILE = "models/stormsense_model.pth"

DEVICE = torch.device("cpu")

# Load data
data = np.load(DATA_FILE)

X = torch.tensor(data["X"], dtype=torch.float32)
Y = torch.tensor(data["Y"], dtype=torch.float32)

# Use the same 80/20 chronological split as training
split = int(len(X) * 0.8)

X_test = X[split:]
Y_test = Y[split:]

# Load model
model = StormSenseModel().to(DEVICE)

model.load_state_dict(
    torch.load(
        MODEL_FILE,
        map_location=DEVICE
    )
)

model.eval()

with torch.no_grad():
    logits = model(X_test)
    probabilities = torch.sigmoid(logits)

# Convert probabilities to binary predictions
predictions = (
    probabilities >= 0.5
).int().numpy()

actual = Y_test.int().numpy()

print()
print("STORMSENSE MODEL EVALUATION")
print("============================")

for i, hours in enumerate(range(2, 7)):

    y_true = actual[:, :, :, i].flatten()
    y_pred = predictions[:, :, :, i].flatten()

    precision = precision_score(
        y_true,
        y_pred,
        zero_division=0
    )

    recall = recall_score(
        y_true,
        y_pred,
        zero_division=0
    )

    f1 = f1_score(
        y_true,
        y_pred,
        zero_division=0
    )

    print()
    print(f"{hours} hour prediction:")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1 score:  {f1:.4f}")

print()
print("Evaluation complete.")