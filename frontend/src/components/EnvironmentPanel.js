import React, { useState } from "react";
import { overrideDevice } from "../api/apiService";

const FAN_SPEEDS = ["off", "low", "medium", "high"];
const FAN_LEVEL = { off: 0, low: 33, medium: 66, high: 100 };
const MUSIC_GENRES = ["Upbeat Pop", "Calm Acoustic", "Lo-fi / Ambient", "Light Jazz", "Upbeat", "Soft Instrumental", "None"];
const MUSIC_VISUALS = {
  "Upbeat Pop": { accent: "#ff7d6d", glow: "rgba(255, 125, 109, 0.35)", tagline: "Bright vocals and high-energy rhythm" },
  "Calm Acoustic": { accent: "#8bb7ff", glow: "rgba(139, 183, 255, 0.28)", tagline: "Soft strings for a calm, supportive mood" },
  "Lo-fi / Ambient": { accent: "#86e6d1", glow: "rgba(134, 230, 209, 0.28)", tagline: "Low-pressure soundscape for focus and decompression" },
  "Light Jazz": { accent: "#f3b35f", glow: "rgba(243, 179, 95, 0.28)", tagline: "Smooth background music for balanced comfort" },
  Upbeat: { accent: "#7ae582", glow: "rgba(122, 229, 130, 0.28)", tagline: "Fast lift in energy and alertness" },
  "Soft Instrumental": { accent: "#c79bff", glow: "rgba(199, 155, 255, 0.28)", tagline: "Gentle instrumental layering for restfulness" },
  None: { accent: "#6b7280", glow: "rgba(107, 114, 128, 0.25)", tagline: "Silence is recommended for this state" },
};

export default function EnvironmentPanel({ action, onOverride }) {
  const [overrideMsg, setOverrideMsg] = useState("");

  if (!action) {
    return (
      <div className="env-panel empty">
        <p className="placeholder-text">🏠 Environment will adapt after first detection</p>
      </div>
    );
  }

  async function handleOverride(device, value) {
    try {
      const result = await overrideDevice(device, value);
      onOverride && onOverride(device, value, result);
      setOverrideMsg(`✅ ${device} overridden`);
      setTimeout(() => setOverrideMsg(""), 2000);
    } catch {
      setOverrideMsg("❌ Override failed");
    }
  }

  const fanLevel = FAN_LEVEL[action.fan_speed] ?? 66;
  const musicVisual = MUSIC_VISUALS[action.music_genre] || MUSIC_VISUALS.None;

  return (
    <div className="env-panel">
      <h3 className="panel-title">🏠 Environment</h3>
      {action.is_personalized && <div className="personalized-badge">⭐ Personalized Mode Active</div>}
      {overrideMsg && <div className="override-msg">{overrideMsg}</div>}

      {/* LIGHT */}
      <div className="device-card">
        <div className="device-header">
          <span className="device-icon">💡</span>
          <span className="device-name">Lighting</span>
          <span className="device-label">{action.light_label}</span>
        </div>
        <div className="light-box" style={{ backgroundColor: action.light_color }} />
        <div className="override-row">
          <label>Override:</label>
          <input type="color" defaultValue={action.light_color}
            onChange={(e) => handleOverride("light", e.target.value)} className="color-picker" />
        </div>
      </div>

      {/* DISPLAY BRIGHTNESS */}
      <div className="device-card">
        <div className="device-header">
          <span className="device-icon">🖥️</span>
          <span className="device-name">Display Brightness</span>
          <span className="device-label">{action.display_brightness ?? 70}%</span>
        </div>
        <div className="fan-bar-bg">
          <div className="fan-bar-fill" style={{ width: `${action.display_brightness ?? 70}%`, transition: "width 0.5s ease" }} />
        </div>
        <div className="override-row override-stack">
          <label htmlFor="brightness-range">Laptop brightness</label>
          <input
            id="brightness-range"
            type="range"
            min="10"
            max="100"
            value={action.display_brightness ?? 70}
            onChange={(e) => handleOverride("display_brightness", Number(e.target.value))}
            className="range-slider"
          />
          <span className="range-value">
            {action.display_brightness ?? 70}% {action.hardware_supported === false ? "(UI fallback)" : ""}
          </span>
        </div>
      </div>

      {/* FAN */}
      <div className="device-card">
        <div className="device-header">
          <span className="device-icon">🌀</span>
          <span className="device-name">Fan Speed</span>
          <span className="device-label">{action.fan_speed}</span>
        </div>
        <div className="fan-bar-bg">
          <div className="fan-bar-fill" style={{ width: `${fanLevel}%`, transition: "width 0.5s ease" }} />
        </div>
        <div className="override-row">
          {FAN_SPEEDS.map((speed) => (
            <button key={speed}
              className={`speed-btn ${action.fan_speed === speed ? "active" : ""}`}
              onClick={() => handleOverride("fan", speed)}>{speed}</button>
          ))}
        </div>
      </div>

      {/* MUSIC */}
      <div className="device-card">
        <div className="device-header">
          <span className="device-icon">🎵</span>
          <span className="device-name">Music</span>
          <span className="device-label">{action.music_genre}</span>
        </div>
        <div className="music-hero" style={{ "--music-accent": musicVisual.accent, "--music-glow": musicVisual.glow }}>
          <div className="music-cover">
            <div className="music-vinyl" />
          </div>
          <div className="music-meta">
            <span className="music-badge">Adaptive soundtrack</span>
            <h4>{action.music_genre}</h4>
            <p>{musicVisual.tagline}</p>
          </div>
        </div>
        {action.music_url && action.music_genre !== "None" && (
          <div className="spotify-embed-shell">
            <iframe src={action.music_url} width="100%" height="152" frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              title="Spotify Player" className="spotify-embed" />
          </div>
        )}
        {action.music_genre === "None" && <p className="no-music">🔇 No music for this mood</p>}
        <div className="override-row">
          <select defaultValue={action.music_genre}
            onChange={(e) => handleOverride("music", e.target.value)} className="music-select">
            {MUSIC_GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="device-card notif-card">
        <div className="device-header">
          <span className="device-icon">🔔</span>
          <span className="device-name">Notifications</span>
          <span className={`notif-status ${action.notifications_on ? "on" : "off"}`}>
            {action.notifications_on ? "ON" : "MUTED"}
          </span>
        </div>
        <button className={`toggle-btn ${action.notifications_on ? "active" : ""}`}
          onClick={() => handleOverride("notifications", !action.notifications_on)}>
          {action.notifications_on ? "🔔 Mute" : "🔕 Unmute"}
        </button>
      </div>

      {action.description && <p className="action-description">💬 {action.description}</p>}
    </div>
  );
}
