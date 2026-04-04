"""
emotion_detector.py
Uses DeepFace to analyze a base64-encoded image and return
the dominant emotion + confidence scores.
"""

import base64
import numpy as np
import cv2
from deepface import DeepFace


def decode_base64_image(base64_string):
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    img_bytes = base64.b64decode(base64_string)
    img_array = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    return img


def detect_emotion(base64_image):
    try:
        img = decode_base64_image(base64_image)

        if img is None:
            return {
                "dominant_emotion": "neutral",
                "confidence": 0.0,
                "all_scores": {},
                "error": "Could not decode image"
            }

        result = DeepFace.analyze(
            img_path=img,
            actions=["emotion"],
            enforce_detection=False,
            silent=True
        )

        if isinstance(result, list):
            result = result[0]

        emotion_scores = result.get("emotion", {})
        dominant_emotion = result.get("dominant_emotion", "neutral")
        dominant_emotion = normalize_emotion(dominant_emotion)

        confidence = emotion_scores.get(dominant_emotion, 0.0)
        if confidence == 0.0:
            confidence = max(emotion_scores.values()) if emotion_scores else 50.0

        return {
            "dominant_emotion": dominant_emotion,
            "confidence": round(float(confidence), 2),
            "all_scores": {k: round(float(v), 2) for k, v in emotion_scores.items()},
            "error": None
        }

    except Exception as e:
        return {
            "dominant_emotion": "neutral",
            "confidence": 50.0,
            "all_scores": {},
            "error": str(e)
        }


def normalize_emotion(emotion):
    emotion = emotion.lower().strip()
    mapping = {
        "angry": "angry",
        "disgust": "angry",
        "fear": "stressed",
        "happy": "happy",
        "sad": "sad",
        "surprise": "surprised",
        "neutral": "neutral",
        "stressed": "stressed",
        "tired": "tired",
        "surprised": "surprised"
    }
    return mapping.get(emotion, "neutral")