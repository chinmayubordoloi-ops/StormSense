import numpy as np
import torch

from model import StormSenseModel

DATA_FILE = "data/processed/normalized_sequences.npz"
MODEL_FILE = "models/stormsense_model.pth"

DEVICE = torch.device("cpu")

data = np.load(DATA_FILE)

X = torch.tensor(data["X"], dtype=torch.float32)
Y = torch.tensor(data["Y"], dtype=torch.float32)

print("X shape:", X.shape)
print("Y shape:", Y.shape)

model = StormSenseModel().to(DEVICE)

model.load_state_dict(
    torch.load(
        MODEL_FILE,
        map_location=DEVICE
    )
)

model.eval()

with torch.no_grad():

    logits = model(X.to(DEVICE))

    probabilities = torch.sigmoid(logits)

print()
print("Probability statistics:")

for i, hours in enumerate([2, 3, 4, 5, 6]):

    p = probabilities[:, :, :, i]

    print()
    print(f"{hours} hour prediction:")
    print("Minimum:", p.min().item())
    print("Maximum:", p.max().item())
    print("Mean:", p.mean().item())
    print("Median:", p.median().item())

print()
print("PREDICTION CHECK COMPLETE")