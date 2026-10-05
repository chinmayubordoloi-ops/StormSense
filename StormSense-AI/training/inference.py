import numpy as np
import torch

from model import StormSenseModel


MODEL_FILE = "models/stormsense_model.pth"
STATS_FILE = "data/processed/normalization_stats.npz"
DATA_FILE = "data/processed/normalized_sequences.npz"

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


def predict(model, X):
    # X must be:
    # (6, 17, 29, 7)

    if X.shape != (6, 17, 29, 7):
        raise ValueError(
            f"Expected (6, 17, 29, 7), got {X.shape}"
        )

    # Add ONE batch dimension
    X = torch.tensor(
        X,
        dtype=torch.float32
    ).unsqueeze(0).to(DEVICE)

    with torch.no_grad():
        logits = model(X)
        probabilities = torch.sigmoid(logits)

    # Remove batch dimension
    return probabilities.squeeze(0).cpu().numpy()


if __name__ == "__main__":

    print("StormSense AI Inference Test")
    print("----------------------------")

    # Load normalized dataset
    data = np.load(DATA_FILE)

    X = data["X"]

    print("Dataset shape:", X.shape)

    # Take one sample
    sample = X[0]

    print("Sample shape:", sample.shape)

    # Load model
    model = load_model()

    # IMPORTANT:
    # sample is ALREADY normalized.
    # Do NOT normalize it again.

    predictions = predict(
        model,
        sample
    )

    print("Prediction shape:", predictions.shape)

    for i, hour in enumerate([2, 3, 4, 5, 6]):

        grid = predictions[:, :, i]

        print()
        print(f"{hour}-hour prediction:")
        print("Minimum:", float(grid.min()))
        print("Maximum:", float(grid.max()))
        print("Mean:", float(grid.mean()))

    print()
    print("INFERENCE TEST COMPLETE")