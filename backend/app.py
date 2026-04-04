"""
app.py
Flask REST API — main server entry point.
Run with: python app.py
"""

import os

from flask import Flask, request, jsonify
from flask_cors import CORS

from database import init_db, save_session, get_preferences, get_recent_sessions
from emotion_detector import detect_emotion
from decision_engine import decide_action
from learning_engine import record_feedback
from iot_controller import apply_override

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

init_db()
print("Database initialized")


@app.route("/detect-emotion", methods=["POST"])
def detect_emotion_endpoint():
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image provided"}), 400

    detection = detect_emotion(data["image"])
    if not detection.get("face_detected", True):
        return jsonify({
            "emotion": None,
            "confidence": 0.0,
            "all_scores": {},
            "action": None,
            "session_id": None,
            "face_detected": False,
            "detection_error": detection.get("error", "No facial detection")
        })

    emotion = detection["dominant_emotion"]
    confidence = detection["confidence"]
    all_scores = detection["all_scores"]

    action = decide_action(emotion, confidence, all_scores)
    session_id = save_session(emotion, confidence, action)
    action["session_id"] = session_id

    return jsonify({
        "emotion": emotion,
        "confidence": confidence,
        "all_scores": all_scores,
        "action": action,
        "session_id": session_id,
        "face_detected": True,
        "detection_error": detection.get("error")
    })


@app.route("/get-action", methods=["GET"])
def get_action_endpoint():
    emotion = request.args.get("emotion", "neutral").lower()
    action = decide_action(emotion, confidence=100.0)
    return jsonify({"emotion": emotion, "action": action})


@app.route("/submit-feedback", methods=["POST"])
def submit_feedback_endpoint():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    for field in ["session_id", "emotion", "action", "rating"]:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    if data["rating"] not in ["thumbsup", "thumbsdown", "skip"]:
        return jsonify({"error": "rating must be thumbsup, thumbsdown, or skip"}), 400

    result = record_feedback(
        emotion=data["emotion"],
        action=data["action"],
        rating=data["rating"],
        session_id=data["session_id"]
    )
    return jsonify(result)


@app.route("/get-preferences", methods=["GET"])
def get_preferences_endpoint():
    prefs = get_preferences()
    return jsonify({"preferences": prefs, "count": len(prefs)})


@app.route("/override-device", methods=["POST"])
def override_device_endpoint():
    data = request.get_json()
    if not data or "device" not in data or "value" not in data:
        return jsonify({"error": "device and value are required"}), 400
    result = apply_override(data["device"], data["value"])
    return jsonify(result)


@app.route("/recent-sessions", methods=["GET"])
def recent_sessions_endpoint():
    limit = int(request.args.get("limit", 20))
    sessions = get_recent_sessions(limit)
    return jsonify({"sessions": sessions, "count": len(sessions)})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "Emotion-Aware Smart Environment API"})


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "1").strip().lower() in {"1", "true", "yes", "on"}

    print(f"Starting backend at http://localhost:{port}")
    app.run(debug=debug, host=host, port=port)
