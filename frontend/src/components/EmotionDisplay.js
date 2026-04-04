import React from "react";

const EMOTION_EMOJIS = {
  happy: "😄", sad: "😢", stressed: "😰",
  angry: "😠", neutral: "😐", surprised: "😲", tired: "😴",
};

const EMOTION_COLORS = {
  happy: "#FFD700", sad: "#4A90D9", stressed: "#7EB8D4",
  angry: "#E55A5A", neutral: "#A0A0A0", surprised: "#FFFFFF", tired: "#FF8C00",
};

export default function EmotionDisplay({ emotion, confidence, allScores, intensity }) {
  if (!emotion) {
    return (
      <div className="emotion-display empty">
        <p className="placeholder-text">📷 Point your camera at your face to begin</p>
      </div>
    );
  }

  const emoji = EMOTION_EMOJIS[emotion] || "🤔";
  const color = EMOTION_COLORS[emotion] || "#A0A0A0";

  return (
    <div className="emotion-display">
      <div className="emotion-main">
        <span className="emotion-emoji">{emoji}</span>
        <div className="emotion-info">
          <h2 className="emotion-label">{emotion.charAt(0).toUpperCase() + emotion.slice(1)}</h2>
          <span className="intensity-badge" style={{ backgroundColor: color + "33", color }}>
            {intensity} Signal
          </span>
        </div>
      </div>

      <div className="confidence-section">
        <div className="confidence-header">
          <span>Confidence</span>
          <span className="confidence-value">{confidence?.toFixed(1)}%</span>
        </div>
        <div className="confidence-bar-bg">
          <div
            className="confidence-bar-fill"
            style={{ width: `${confidence}%`, backgroundColor: color, transition: "width 0.6s ease" }}
          />
        </div>
      </div>

      {allScores && Object.keys(allScores).length > 0 && (
        <div className="all-scores">
          <h4>All Emotion Scores</h4>
          {Object.entries(allScores)
            .sort(([, a], [, b]) => b - a)
            .map(([emo, score]) => (
              <div key={emo} className="score-row">
                <span className="score-label">{EMOTION_EMOJIS[emo] || "•"} {emo}</span>
                <div className="score-bar-bg">
                  <div className="score-bar-fill" style={{ width: `${score}%`, backgroundColor: EMOTION_COLORS[emo] || "#666" }} />
                </div>
                <span className="score-pct">{score.toFixed(1)}%</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}