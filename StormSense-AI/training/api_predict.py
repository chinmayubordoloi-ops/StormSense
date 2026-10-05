import json
import sys

import numpy as np
import torch

from model import StormSenseModel


MODEL_FILE = "models/stormsense_model.pth"
DATA_FILE = "data/processed/normalized_sequences.npz"

DEVICE = torch.device("cpu")


def main():

    # Optional sample index from Node.js
    sample_index = 0

    if len(sys.argv) > 1:
        sample_index = int(sys.argv[1])

    data = np.load(DATA_FILE)
    X = data["X"]

    if X.ndim != 5:
        raise ValueError(f"Expected 5D dataset, got {X.shape}")

    if X.shape[1:] != (6, 17, 29, 7):
        raise ValueError(
            f"Expected samples shaped (6,17,29,7), got {X.shape[1:]}"
        )

    if sample_index < 0 or sample_index >= len(X):
        raise ValueError(
            f"Sample index {sample_index} is outside dataset"
        )

    sample = X[sample_index]

    model = StormSenseModel().to(DEVICE)

    model.load_state_dict(
        torch.load(
            MODEL_FILE,
            map_location=DEVICE
        )
    )

    model.eval()

    tensor = torch.tensor(
        sample,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(tensor)
        probabilities = torch.sigmoid(logits)

    prediction = probabilities.squeeze(0).cpu().numpy()

    result = {
        "sampleIndex": sample_index,
        "grid": {
            "latitude": 17,
            "longitude": 29
        },
        "hours": {}
    }

    for i, hour in enumerate([2, 3, 4, 5, 6]):

        grid = prediction[:, :, i]

        result["hours"][str(hour)] = {
            "maxProbability": float(grid.max()),
            "meanProbability": float(grid.mean())
        }

    print(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(
            json.dumps({
                "error": str(e)
            })
        )
        sys.exit(1)