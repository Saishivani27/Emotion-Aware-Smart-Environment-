"""
decision_engine.py
Takes emotion + confidence → produces final action recommendation.
"""

from learning_engine import get_personalized_action

CONFIDENCE_THRESHOLD = 35.0


def decide_action(emotion, confidence, all_scores=None):
    effective_emotion = emotion
    if confidence < CONFIDENCE_THRESHOLD:
        effective_emotion = "neutral"
        confidence_note = f"Low confidence ({confidence:.1f}%) — defaulting to neutral"
    else:
        confidence_note = f"Confident detection ({confidence:.1f}%)"

    action = get_personalized_action(effective_emotion)
    action["confidence_note"] = confidence_note
    action["raw_emotion"] = emotion
    action["effective_emotion"] = effective_emotion
    action["intensity"] = _get_intensity_label(confidence)

    return action


def _get_intensity_label(confidence):
    if confidence >= 80:
        return "Strong"
    elif confidence >= 60:
        return "Moderate"
    elif confidence >= 40:
        return "Mild"
    else:
        return "Weak"