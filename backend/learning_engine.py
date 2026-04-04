"""
learning_engine.py
Combines current emotion with past learned preferences
to produce a personalized environment action.
"""

from database import get_preference_for_emotion, update_preferences
from iot_controller import get_default_action


def get_personalized_action(emotion):
    pref = get_preference_for_emotion(emotion)
    default_action = get_default_action(emotion)

    if pref and _should_lock_preference(pref):
        learned_action = {
            "emotion": emotion,
            "light_color": pref["light_color"] or default_action["light_color"],
            "fan_speed": pref["fan_speed"] or default_action["fan_speed"],
            "music_genre": pref["music_genre"] or default_action["music_genre"],
            "notifications_on": bool(pref["notifications_on"]),
            "display_brightness": pref["display_brightness"] or default_action["display_brightness"],
            "light_label": default_action.get("light_label", "Custom"),
            "description": (
                f"Personalized from feedback: {pref['positive_count']} positive, "
                f"{pref['negative_count']} negative, {pref.get('skip_count', 0)} skipped."
            ),
            "fan_level": _fan_level(pref["fan_speed"]),
            "music_url": default_action.get("music_url"),
            "is_personalized": True,
            "learning_state": "locked_preference",
            "positive_count": pref["positive_count"],
            "negative_count": pref["negative_count"],
            "skip_count": pref.get("skip_count", 0)
        }
        return learned_action

    if pref and _should_avoid_repeat(pref):
        safe_action = default_action.copy()
        safe_action["music_genre"] = "None"
        safe_action["music_url"] = None
        safe_action["notifications_on"] = False
        safe_action["fan_speed"] = "low" if safe_action["fan_speed"] == "high" else safe_action["fan_speed"]
        safe_action["fan_level"] = _fan_level(safe_action["fan_speed"])
        safe_action["display_brightness"] = min(safe_action.get("display_brightness", 70), 55)
        safe_action["description"] = (
            f"Avoiding repeated mistakes: {pref['negative_count']} negative and "
            f"{pref.get('skip_count', 0)} skipped responses triggered a calmer fallback."
        )
        safe_action["is_personalized"] = True
        safe_action["learning_state"] = "avoid_repeat"
        safe_action["positive_count"] = pref["positive_count"]
        safe_action["negative_count"] = pref["negative_count"]
        safe_action["skip_count"] = pref.get("skip_count", 0)
        return safe_action

    default_action["is_personalized"] = False
    default_action["learning_state"] = "collecting_feedback"
    default_action["positive_count"] = pref["positive_count"] if pref else 0
    default_action["negative_count"] = pref["negative_count"] if pref else 0
    default_action["skip_count"] = pref.get("skip_count", 0) if pref else 0
    return default_action


def record_feedback(emotion, action, rating, session_id):
    from database import save_feedback
    save_feedback(session_id, rating)
    update_preferences(emotion, action, rating)
    return {"status": "feedback recorded", "rating": rating, "emotion": emotion}


def _fan_level(fan_speed):
    levels = {"off": 0, "low": 33, "medium": 66, "high": 100}
    return levels.get(fan_speed, 66)


def _should_lock_preference(pref):
    positive = pref.get("positive_count", 0)
    negative = pref.get("negative_count", 0)
    return positive >= 2 and positive > negative


def _should_avoid_repeat(pref):
    negative = pref.get("negative_count", 0)
    skip = pref.get("skip_count", 0)
    positive = pref.get("positive_count", 0)
    return (negative >= 2 or skip >= 2) and positive <= negative
