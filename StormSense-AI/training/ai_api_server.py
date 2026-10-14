import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import torch

from model import StormSenseModel

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODEL_FILE = PROJECT_ROOT / "models" / "stormsense_model.pth"
DATA_FILE = PROJECT_ROOT / "data" / "processed" / "normalized_sequences.npz"
HOST = "127.0.0.1"
PORT = 5001
DEVICE = torch.device("cpu")

# Small CPU inference workloads can be slower when too many threads compete.
try:
    torch.set_num_threads(4)
except Exception:
    pass


def load_model_once():
    print("[AI] Loading StormSense model...", flush=True)
    model = StormSenseModel().to(DEVICE)
    state = torch.load(MODEL_FILE, map_location=DEVICE)
    model.load_state_dict(state)
    model.eval()
    print("[AI] Model loaded and ready.", flush=True)
    return model


def load_sample_once():
    print("[AI] Loading normalized input sample...", flush=True)
    with np.load(DATA_FILE) as data:
        sample = np.asarray(data["X"][0], dtype=np.float32)

    expected = (6, 17, 29, 7)
    if sample.shape != expected:
        raise ValueError(f"Expected sample shape {expected}, got {sample.shape}")

    tensor = torch.from_numpy(sample).unsqueeze(0).to(DEVICE)
    print("[AI] Input sample loaded.", flush=True)
    return tensor


# Load these once at service startup, not once per HTTP request.
MODEL = load_model_once()
INPUT_TENSOR = load_sample_once()


def make_prediction():
    with torch.inference_mode():
        logits = MODEL(INPUT_TENSOR)
        probabilities = torch.sigmoid(logits)

    prediction_grid = probabilities.squeeze(0).cpu().numpy()
    result = {"success": True, "predictions": {}}

    for i, hour in enumerate([2, 3, 4, 5, 6]):
        grid = prediction_grid[:, :, i]
        result["predictions"][str(hour)] = {
            "maxProbability": float(grid.max()),
            "meanProbability": float(grid.mean()),
        }

    return result


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path != "/predict":
            self.send_json(404, {"success": False, "error": "Not found"})
            return

        try:
            result = make_prediction()
            self.send_json(200, result)
        except Exception as exc:
            print(f"[AI] Prediction error: {exc}", flush=True)
            self.send_json(500, {"success": False, "error": "AI prediction failed"})

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string, *args):
        print("[AI HTTP] " + (format_string % args), flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"[AI] Persistent prediction service listening on http://{HOST}:{PORT}", flush=True)
    print("[AI] Keep this terminal open while using StormSense.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[AI] Shutting down.", flush=True)
    finally:
        server.server_close()
