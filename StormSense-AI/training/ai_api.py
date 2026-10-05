import json
import sys
import numpy as np
import torch

from model import StormSenseModel

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent

MODEL_FILE = PROJECT_ROOT / "models" / "stormsense_model.pth"
DATA_FILE = PROJECT_ROOT / "data" / "processed" / "normalized_sequences.npz"
DEVICE = torch.device("cpu")


def load_model():
    model = StormSenseModel().to(DEVICE)

    model.load_state_dict(
        torch.load(
            MODEL_FILE,
            map_location=DEVICE
        )
    )

    model.eval()
    return model


def main():
    data = np.load(DATA_FILE)
    X = data["X"]

    # Existing normalized test sequence
    sample = X[0]

    if sample.shape != (6, 17, 29, 7):
        raise ValueError(
            f"Expected sample shape (6,17,29,7), got {sample.shape}"
        )

    model = load_model()

    tensor = torch.tensor(
        sample,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(tensor)
        probabilities = torch.sigmoid(logits)

    predictions = probabilities.squeeze(0).cpu().numpy()

    result = {
        "success": True,
        "predictions": {}
    }

    for i, hour in enumerate([2, 3, 4, 5, 6]):
        grid = predictions[:, :, i]

        result["predictions"][str(hour)] = {
            "maxProbability": float(grid.max()),
            "meanProbability": float(grid.mean())
        }

    print(json.dumps(result))


if __name__ == "__main__":
    main()