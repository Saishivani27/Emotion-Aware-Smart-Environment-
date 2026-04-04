"""
iot_controller.py
Default emotion → environment mappings.
Simulated IoT — no real hardware needed.
"""

from brightness_controller import set_display_brightness, get_display_brightness

EMOTION_DEFAULTS = {
    "happy":     {"light_color": "#FFD700", "fan_speed": "medium", "music_genre": "Upbeat Pop",        "notifications_on": True,  "light_label": "Warm Yellow",  "display_brightness": 82, "description": "Energetic and bright to match your mood!"},
    "sad":       {"light_color": "#4A90D9", "fan_speed": "low",    "music_genre": "Calm Acoustic",     "notifications_on": False, "light_label": "Soft Blue",    "display_brightness": 48, "description": "Gentle environment to keep you calm and supported."},
    "stressed":  {"light_color": "#E0F0FF", "fan_speed": "high",   "music_genre": "Lo-fi / Ambient",   "notifications_on": False, "light_label": "Cool White",   "display_brightness": 55, "description": "Cooling distraction-free environment to ease stress."},
    "angry":     {"light_color": "#8B0000", "fan_speed": "high",   "music_genre": "Grounding Ambient", "notifications_on": False, "light_label": "Deep Red",     "display_brightness": 35, "description": "Grounding ambient sound and dim lighting to help you cool down."},
    "neutral":   {"light_color": "#F5F5DC", "fan_speed": "medium", "music_genre": "Light Jazz",        "notifications_on": True,  "light_label": "Daylight",     "display_brightness": 68, "description": "Balanced environment for a comfortable session."},
    "surprised": {"light_color": "#FFFFFF", "fan_speed": "medium", "music_genre": "Upbeat",            "notifications_on": True,  "light_label": "Bright White", "display_brightness": 88, "description": "Bright and alert to match your energy."},
    "tired":     {"light_color": "#FF8C00", "fan_speed": "low",    "music_genre": "Soft Instrumental", "notifications_on": False, "light_label": "Dim Orange",   "display_brightness": 42, "description": "Warm dim lighting and soft music to help you rest."},
}

FAN_SPEED_LEVELS = {"off": 0, "low": 33, "medium": 66, "high": 100}

MUSIC_SUGGESTIONS = {
    "Upbeat Pop":        "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
    "Calm Acoustic":     "https://open.spotify.com/embed/playlist/37i9dQZF1DX504r1DvyvxG",
    "Lo-fi / Ambient":   "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4edens3",
    "Grounding Ambient": "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4edens3",
    "Light Jazz":        "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt",
    "Upbeat":            "https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0",
    "Soft Instrumental": "https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u",
    "None": None
}


def get_default_action(emotion):
    action = EMOTION_DEFAULTS.get(emotion, EMOTION_DEFAULTS["neutral"]).copy()
    action["emotion"] = emotion
    action["fan_level"] = FAN_SPEED_LEVELS.get(action["fan_speed"], 66)
    action["music_url"] = MUSIC_SUGGESTIONS.get(action["music_genre"])
    action["display_brightness"] = action.get("display_brightness", get_display_brightness())
    return action


def apply_override(device, value):
    if device == "light":
        return {"device": "light", "light_color": value, "status": "overridden"}
    elif device == "fan":
        return {"device": "fan", "fan_speed": value, "fan_level": FAN_SPEED_LEVELS.get(value, 66), "status": "overridden"}
    elif device == "music":
        return {"device": "music", "music_genre": value, "music_url": MUSIC_SUGGESTIONS.get(value), "status": "overridden"}
    elif device == "notifications":
        return {"device": "notifications", "notifications_on": bool(value), "status": "overridden"}
    elif device == "display_brightness":
        return set_display_brightness(value)
    return {"device": device, "status": "unknown device"}
