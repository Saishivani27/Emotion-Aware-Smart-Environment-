"""
brightness_controller.py
Optional laptop brightness control for Windows demos.
Falls back gracefully if hardware control is unavailable.
"""

from __future__ import annotations

from typing import Optional

try:
    import screen_brightness_control as sbc
except Exception:  # pragma: no cover - optional dependency
    sbc = None


def set_display_brightness(value: int):
    clamped = max(10, min(100, int(value)))

    if sbc is None:
        return {
            "device": "display_brightness",
            "display_brightness": clamped,
            "status": "simulated",
            "hardware_supported": False,
            "message": "screen-brightness-control is not installed; using UI fallback.",
        }

    try:
        sbc.set_brightness(clamped)
        return {
            "device": "display_brightness",
            "display_brightness": clamped,
            "status": "overridden",
            "hardware_supported": True,
            "message": "Laptop display brightness updated.",
        }
    except Exception as exc:  # pragma: no cover - hardware dependent
        return {
            "device": "display_brightness",
            "display_brightness": clamped,
            "status": "simulated",
            "hardware_supported": False,
            "message": f"Brightness control unavailable on this display: {exc}",
        }


def get_display_brightness(default: int = 70) -> Optional[int]:
    if sbc is None:
        return default

    try:
        current = sbc.get_brightness()
        if isinstance(current, list) and current:
            return int(current[0])
        return int(current)
    except Exception:  # pragma: no cover - hardware dependent
        return default
