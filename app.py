from collections import deque
from io import BytesIO
import threading

from flask import Flask, jsonify, make_response, request, send_file

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt


app = Flask(__name__)

# Keep last 30 entries in memory.
emotion_history = deque(maxlen=30)
history_lock = threading.Lock()

# Store latest graph bytes for quick GET refresh.
latest_graph_png = None


def _build_graph_png():
  """Generate graph PNG from in-memory history and return bytes."""
  with history_lock:
    points = list(emotion_history)

  times = [p["timestamp"] for p in points]
  confidences = [p["confidence"] for p in points]
  emotions = [p["emotion"] for p in points]

  fig, ax = plt.subplots(figsize=(8, 3))
  fig.patch.set_facecolor("#0a0f1a")
  ax.set_facecolor("#121a2a")

  if len(confidences) > 0:
    ax.plot(times, confidences, color="#5aa9ff", linewidth=2)

    # Color-code last point by emotion label for quick visual cue.
    last_emotion = emotions[-1]
    color_map = {
      "happy": "#2ecc71",
      "neutral": "#c2cad8",
      "sad": "#4a90e2",
      "angry": "#ff5b5b",
      "fearful": "#ff975e",
      "disgusted": "#bd8fff",
      "surprised": "#ffd166",
    }
    ax.scatter([times[-1]], [confidences[-1]], color=color_map.get(last_emotion, "#ffffff"), s=40, zorder=3)

  ax.set_ylim(0, 1)
  ax.set_xlabel("Time", color="#c7d3e8")
  ax.set_ylabel("Confidence", color="#c7d3e8")
  ax.set_title("Top Emotion Confidence Over Time", color="#eaf1ff")
  ax.tick_params(colors="#9fb0cc", labelsize=8)
  ax.grid(color="white", alpha=0.12)

  # Keep x ticks readable.
  if len(times) > 8:
    step = max(1, len(times) // 8)
    shown = [t if i % step == 0 else "" for i, t in enumerate(times)]
    ax.set_xticks(range(len(times)))
    ax.set_xticklabels(shown, rotation=25, ha="right")

  plt.tight_layout()
  buf = BytesIO()
  fig.savefig(buf, format="png", dpi=120)
  plt.close(fig)
  buf.seek(0)
  return buf.getvalue()


@app.after_request
def add_cors_headers(response):
  # Allows frontend (Node app origin / ngrok origin) to call Flask API.
  response.headers["Access-Control-Allow-Origin"] = "*"
  response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
  response.headers["Access-Control-Allow-Headers"] = "Content-Type"
  return response


@app.route("/update-emotion", methods=["POST", "OPTIONS"])
def update_emotion():
  if request.method == "OPTIONS":
    return make_response("", 204)

  payload = request.get_json(silent=True) or {}
  emotion = str(payload.get("emotion", "unknown"))
  confidence = float(payload.get("confidence", 0))
  timestamp = str(payload.get("timestamp", ""))

  entry = {
    "emotion": emotion,
    "confidence": max(0.0, min(1.0, confidence)),
    "timestamp": timestamp,
  }

  with history_lock:
    emotion_history.append(entry)

  global latest_graph_png
  latest_graph_png = _build_graph_png()

  # Requirement: return graph image as PNG response.
  return send_file(BytesIO(latest_graph_png), mimetype="image/png")


@app.route("/emotion-graph", methods=["GET"])
def emotion_graph():
  # Useful for periodic refresh every few seconds.
  global latest_graph_png
  if latest_graph_png is None:
    latest_graph_png = _build_graph_png()
  return send_file(BytesIO(latest_graph_png), mimetype="image/png")


@app.route("/health", methods=["GET"])
def health():
  return jsonify({"ok": True, "points": len(emotion_history)})


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000, debug=False)

