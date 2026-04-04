import React, { useEffect, useState } from "react";
import { getPreferences, getRecentSessions } from "../api/apiService";

const EMOTION_EMOJIS = {
  happy: "😄", sad: "😢", stressed: "😰",
  angry: "😠", neutral: "😐", surprised: "😲", tired: "😴",
};

export default function LearningLog() {
  const [preferences, setPreferences] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("preferences");

  async function loadData() {
    try {
      const [prefData, sessionData] = await Promise.all([
        getPreferences(),
        getRecentSessions(15),
      ]);
      setPreferences(prefData.preferences || []);
      setSessions(sessionData.sessions || []);
    } catch (e) {
      console.error("LearningLog load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="learning-log"><h3>🧠 Learning Log</h3><p className="placeholder-text">Loading...</p></div>;

  const positiveSignals = preferences.reduce((sum, pref) => sum + (pref.positive_count || 0), 0);
  const negativeSignals = preferences.reduce((sum, pref) => sum + (pref.negative_count || 0), 0);
  const skippedSignals = preferences.reduce((sum, pref) => sum + (pref.skip_count || 0), 0);
  const lockedCount = preferences.filter((pref) => (pref.positive_count || 0) >= 2 && (pref.positive_count || 0) > (pref.negative_count || 0)).length;
  const recentMood = sessions[0]?.emotion || "none yet";

  return (
    <div className="learning-log">
      <div className="log-header">
        <h3>🧠 Learning Log</h3>
        <button className="refresh-btn" onClick={loadData}>↻ Refresh</button>
      </div>

      <div className="insight-grid">
        <div className="insight-card">
          <span className="insight-label">Positive Signals</span>
          <strong>{positiveSignals}</strong>
        </div>
        <div className="insight-card">
          <span className="insight-label">Locked Preferences</span>
          <strong>{lockedCount}</strong>
        </div>
        <div className="insight-card">
          <span className="insight-label">Negative Signals</span>
          <strong>{negativeSignals}</strong>
        </div>
        <div className="insight-card">
          <span className="insight-label">Skipped Signals</span>
          <strong>{skippedSignals}</strong>
        </div>
        <div className="insight-card">
          <span className="insight-label">Latest Mood</span>
          <strong>{recentMood}</strong>
        </div>
      </div>

      <div className="log-tabs">
        <button className={`tab-btn ${activeTab === "preferences" ? "active" : ""}`} onClick={() => setActiveTab("preferences")}>
          📊 Preferences ({preferences.length})
        </button>
        <button className={`tab-btn ${activeTab === "sessions" ? "active" : ""}`} onClick={() => setActiveTab("sessions")}>
          📋 Sessions ({sessions.length})
        </button>
      </div>

      {activeTab === "preferences" && (
        <div className="pref-list">
          {preferences.length === 0 ? (
            <p className="placeholder-text">No preferences yet. Use 👍/👎 after detections to train the system!</p>
          ) : preferences.map((pref) => (
            <div key={pref.emotion} className="pref-card">
              <div className="pref-header">
                <span className="pref-emotion">{EMOTION_EMOJIS[pref.emotion] || "•"} {pref.emotion}</span>
                <div className="pref-votes">
                  <span className="vote-pos">👍 {pref.positive_count}</span>
                  <span className="vote-neg">👎 {pref.negative_count}</span>
                  <span className="vote-skip">⏭ {pref.skip_count || 0}</span>
                </div>
              </div>
              <div className="pref-details">
                <span>💡 {pref.light_color}</span>
                <span>🌀 {pref.fan_speed}</span>
                <span>🖥️ {pref.display_brightness ?? 70}%</span>
                <span>🎵 {pref.music_genre}</span>
                <span>{pref.notifications_on ? "🔔 ON" : "🔕 OFF"}</span>
              </div>
              {pref.positive_count >= 2 && pref.positive_count > (pref.negative_count || 0) && <div className="locked-badge">⭐ Preference Locked In</div>}
              {((pref.negative_count || 0) >= 2 || (pref.skip_count || 0) >= 2) && <div className="avoid-badge">🛡 Avoiding repeated mistakes</div>}
              <div className="pref-updated">Last updated: {new Date(pref.last_updated).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "sessions" && (
        <div className="session-list">
          {sessions.length === 0 ? (
            <p className="placeholder-text">No sessions yet.</p>
          ) : sessions.map((session) => (
            <div key={session.id} className="session-row">
              <span className="session-emotion">{EMOTION_EMOJIS[session.emotion] || "•"} {session.emotion}</span>
              <span className="session-conf">{session.confidence?.toFixed(0)}%</span>
              <span className={`session-rating rating-${session.rating || "none"}`}>
                {session.rating === "thumbsup" ? "👍" : session.rating === "thumbsdown" ? "👎" : session.rating === "skip" ? "⏭" : "—"}
              </span>
              <span className="session-time">{new Date(session.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
