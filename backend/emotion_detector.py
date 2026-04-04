"""
emotion_detector.py
Uses DeepFace to analyze a base64-encoded image and return
the dominant emotion + confidence scores.
"""

import base64
import numpy as np
import cv2
from deepface import DeepFace

FACE_CASCADE = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
)


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

        prepared_face = extract_primary_face(img)
        variants = build_analysis_variants(prepared_face)
        aggregated_scores = analyze_variants(variants)

        dominant_emotion = normalize_emotion(
            max(aggregated_scores, key=aggregated_scores.get) if aggregated_scores else "neutral"
        )
        confidence = aggregated_scores.get(dominant_emotion, 0.0)
        if confidence == 0.0:
            confidence = max(aggregated_scores.values()) if aggregated_scores else 50.0

        return {
            "dominant_emotion": dominant_emotion,
            "confidence": round(float(confidence), 2),
            "all_scores": {k: round(float(v), 2) for k, v in aggregated_scores.items()},
            "error": None
        }

    except Exception as e:
        return {
            "dominant_emotion": "neutral",
            "confidence": 50.0,
            "all_scores": {},
            "error": str(e)
        }


def extract_primary_face(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = FACE_CASCADE.detectMultiScale(
        gray,
        scaleFactor=1.1,
        minNeighbors=5,
        minSize=(96, 96),
    )

    if len(faces) == 0:
        return cv2.resize(img, (224, 224), interpolation=cv2.INTER_CUBIC)

    x, y, w, h = max(faces, key=lambda face: face[2] * face[3])
    pad_x = int(w * 0.18)
    pad_y = int(h * 0.22)
    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(img.shape[1], x + w + pad_x)
    y2 = min(img.shape[0], y + h + pad_y)

    cropped = img[y1:y2, x1:x2]
    return cv2.resize(cropped, (224, 224), interpolation=cv2.INTER_CUBIC)


def build_analysis_variants(face_img):
    variants = [face_img]

    # Contrast-limited histogram equalization helps in uneven lighting.
    lab = cv2.cvtColor(face_img, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced_l = clahe.apply(l_channel)
    enhanced_lab = cv2.merge((enhanced_l, a_channel, b_channel))
    enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    variants.append(enhanced)

    # Mild sharpening preserves expression edges without making the image noisy.
    blurred = cv2.GaussianBlur(face_img, (0, 0), 1.2)
    sharpened = cv2.addWeighted(face_img, 1.4, blurred, -0.4, 0)
    variants.append(sharpened)

    return variants


def analyze_variants(variants):
    accumulated_scores = {}
    total_runs = 0

    for variant in variants:
        result = DeepFace.analyze(
            img_path=variant,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend="opencv",
            align=True,
            silent=True
        )

        if isinstance(result, list):
            result = result[0]

        emotion_scores = result.get("emotion", {})
        normalized_scores = normalize_score_map(emotion_scores)
        for emotion, score in normalized_scores.items():
            accumulated_scores[emotion] = accumulated_scores.get(emotion, 0.0) + score
        total_runs += 1

    if total_runs == 0:
        return {}

    return {
        emotion: score / total_runs
        for emotion, score in accumulated_scores.items()
    }


def normalize_score_map(emotion_scores):
    normalized = {
        "happy": 0.0,
        "sad": 0.0,
        "stressed": 0.0,
        "angry": 0.0,
        "neutral": 0.0,
        "surprised": 0.0,
        "tired": 0.0,
    }

    for emotion, score in emotion_scores.items():
        mapped = normalize_emotion(emotion)
        normalized[mapped] = normalized.get(mapped, 0.0) + float(score)

    return normalized


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
