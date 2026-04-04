import React, { useRef, useState, useCallback, useEffect } from "react";
import Webcam from "react-webcam";
import {
  detectEmotion,
  checkHealth,
  createLocalDemoSession,
  getBaselineAction,
  getPreferences,
  getRecentSessions,
} from "../api/apiService";
import EmotionDisplay from "./EmotionDisplay";
import EnvironmentPanel from "./EnvironmentPanel";
import FeedbackBar from "./FeedbackBar";
import LearningLog from "./LearningLog";

const DETECTION_INTERVAL_MS = 8000;
const EMOTION_OPTIONS = ["happy", "sad", "stressed", "angry", "neutral", "surprised", "tired"];
const EMOTION_LABELS = {
  happy: "Happy",
  sad: "Sad",
  stressed: "Stressed",
  angry: "Angry",
  neutral: "Neutral",
  surprised: "Surprised",
  tired: "Tired",
};
const INTELLIGENCE_STEPS = [
  { title: "Sense", detail: "Camera or manual emotion selection captures the current state." },
  { title: "Think", detail: "The decision engine maps emotion to a personalized room response." },
  { title: "Learn", detail: "Feedback strengthens future recommendations for each emotion." },
  { title: "Act", detail: "The UI updates lighting, fan, music, and notification behavior live." },
];
const REASON_MAP = {
  happy: [
    "Warm tones reinforce positive energy and keep the environment uplifting.",
    "Balanced airflow supports comfort without reducing the energetic mood.",
    "Upbeat audio keeps engagement high and fits a productive happy state.",
  ],
  sad: [
    "Cool soft lighting creates a calm, emotionally supportive atmosphere.",
    "Lower fan intensity avoids overstimulation and keeps the room gentle.",
    "Acoustic music is selected to soothe rather than overwhelm.",
  ],
  stressed: [
    "Cool white lighting reduces visual heaviness and signals calm.",
    "Higher airflow is used to reduce stuffiness and create a fresher feel.",
    "Ambient music and muted notifications reduce cognitive load.",
  ],
  angry: [
    "Dimmer, deeper color tones aim to reduce stimulation.",
    "Notifications are muted to avoid additional triggers.",
    "Music is limited or removed so the environment can de-escalate.",
  ],
  neutral: [
    "Balanced daylight keeps the room suitable for work or rest.",
    "Medium airflow preserves comfort without drawing attention.",
    "Light background music keeps the environment pleasant but unobtrusive.",
  ],
  surprised: [
    "Brighter lighting matches alertness and keeps the user engaged.",
    "Medium airflow keeps the environment active but stable.",
    "Lively music supports elevated energy without becoming chaotic.",
  ],
  tired: [
    "Warm dim tones help the room feel restful and low-pressure.",
    "Low fan speed avoids harsh sensory stimulation.",
    "Soft instrumental music supports recovery and quiet focus.",
  ],
};

export default function Dashboard() {
  const webcamRef = useRef(null);
  const lastAutoDetectionRef = useRef(null);
  const [emotion, setEmotion] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [allScores, setAllScores] = useState({});
  const [action, setAction] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [intensity, setIntensity] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [autoDetect, setAutoDetect] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [backendOnline, setBackendOnline] = useState(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [currentAction, setCurrentAction] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [selectedEmotion, setSelectedEmotion] = useState("neutral");
  const [runCount, setRunCount] = useState(0);
  const [preferencesCount, setPreferencesCount] = useState(0);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [topEmotion, setTopEmotion] = useState("none");
  const [lockedCount, setLockedCount] = useState(0);

  useEffect(() => {
    checkHealth().then((ok) => {
      setBackendOnline(ok);
      setDemoMode(!ok);
      setStatus(ok ? "Backend connected and camera detection ready" : "Backend offline. UI demo mode enabled.");
    });
  }, []);

  const refreshInsights = useCallback(async () => {
    try {
      const [prefData, sessionData] = await Promise.all([
        getPreferences(),
        getRecentSessions(50),
      ]);

      const preferences = prefData.preferences || [];
      const sessions = sessionData.sessions || [];
      const emotionCounts = sessions.reduce((acc, session) => {
        acc[session.emotion] = (acc[session.emotion] || 0) + 1;
        return acc;
      }, {});
      const topEmotionEntry = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

      setPreferencesCount(preferences.length);
      setSessionsCount(sessions.length);
      setLockedCount(preferences.filter((pref) => (pref.positive_count || 0) >= 3).length);
      setTopEmotion(topEmotionEntry ? topEmotionEntry[0] : "none");
    } catch {
      // Leave existing summary metrics in place if data loading fails.
    }
  }, []);

  useEffect(() => {
    refreshInsights();
  }, [refreshInsights]);

  const applyDetectionResult = useCallback((result, mode = "manual") => {
    const lastAuto = lastAutoDetectionRef.current;
    const confidenceGap = Math.abs((lastAuto?.confidence || 0) - (result.confidence || 0));
    const sameEmotion = lastAuto?.emotion === result.emotion;

    if (mode === "auto" && sameEmotion && confidenceGap < 6) {
      setStatus(`Auto-detect: no major change, still ${result.emotion}`);
      return false;
    }

    setEmotion(result.emotion);
    setConfidence(result.confidence);
    setAllScores(result.all_scores || {});
    setAction(result.action);
    setCurrentAction(result.action);
    setSessionId(result.session_id);
    setIntensity(result.action?.intensity || "Moderate");
    setFeedbackKey((k) => k + 1);
    setRunCount((count) => count + 1);
    lastAutoDetectionRef.current = {
      emotion: result.emotion,
      confidence: result.confidence,
    };
    refreshInsights();
    setStatus(
      mode === "auto"
        ? `Auto-detect updated: ${result.emotion} (${result.confidence?.toFixed(1)}%)`
        : `Detected: ${result.emotion} (${result.confidence?.toFixed(1)}%)`
    );
    return true;
  }, [refreshInsights]);

  const runDetection = useCallback(async () => {
    if (!webcamRef.current || isDetecting) return;
    const screenshot = webcamRef.current.getScreenshot();
    if (!screenshot) { setStatus("⚠️ No camera feed. Allow camera access."); return; }

    setIsDetecting(true);
    setStatus("🔍 Detecting...");
    try {
      const result = await detectEmotion(screenshot);
      applyDetectionResult(result, autoDetect ? "auto" : "manual");
    } catch (e) {
      setStatus(`❌ Error: ${e.message}`);
    } finally {
      setIsDetecting(false);
    }
  }, [applyDetectionResult, autoDetect, isDetecting]);

  const runDemoMode = useCallback(() => {
    const result = createLocalDemoSession(selectedEmotion, 100);
    applyDetectionResult({ ...result, action: { ...result.action, intensity: "Strong" } }, "manual");
    setStatus(`UI demo applied for ${result.emotion}`);
  }, [applyDetectionResult, selectedEmotion]);

  useEffect(() => {
    if (!autoDetect || demoMode) return;
    const timer = setInterval(runDetection, DETECTION_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoDetect, demoMode, runDetection]);

  function handleOverride(device, value, result = {}) {
    const key = device === "light"
      ? "light_color"
      : device === "fan"
        ? "fan_speed"
        : device === "display_brightness"
          ? "display_brightness"
        : device === "notifications"
          ? "notifications_on"
          : device;

    setCurrentAction((prev) => ({
      ...prev,
      [key]: value,
      ...(result.hardware_supported === false ? { hardware_supported: false } : {}),
    }));
  }

  const workflowTone = currentAction?.is_personalized ? "Personalized" : "Adaptive";
  const readinessLabel = demoMode ? "Demo-safe mode" : backendOnline ? "Live AI ready" : "Reconnecting";
  const systemModeLabel = demoMode ? "UI Simulation" : "Camera + AI";
  const activeEmotionLabel = emotion ? EMOTION_LABELS[emotion] : "Waiting";
  const activeConfidenceLabel = confidence ? `${confidence.toFixed(0)}%` : "No reading yet";
  const baselineAction = emotion ? getBaselineAction(emotion) : null;
  const currentReasons = emotion ? (REASON_MAP[emotion] || REASON_MAP.neutral) : [];
  const comparisonRows = baselineAction && currentAction ? [
    { label: "Light", baseline: baselineAction.light_label, current: currentAction.light_label || currentAction.light_color },
    { label: "Display", baseline: `${baselineAction.display_brightness}%`, current: `${currentAction.display_brightness ?? baselineAction.display_brightness}%` },
    { label: "Fan", baseline: baselineAction.fan_speed, current: currentAction.fan_speed },
    { label: "Music", baseline: baselineAction.music_genre, current: currentAction.music_genre },
    { label: "Alerts", baseline: baselineAction.notifications_on ? "ON" : "OFF", current: currentAction.notifications_on ? "ON" : "OFF" },
  ] : [];

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="header-left">
          <h1>🧠 Emotion-Aware Smart Environment</h1>
          <span className={`backend-badge ${backendOnline ? "online" : "offline"}`}>
            {backendOnline === null ? "Checking..." : backendOnline ? "API Online" : "API Offline"}
          </span>
        </div>
        <div className="header-right">
          <span className="status-bar">{status}</span>
        </div>
      </header>

      <div className="dash-grid">
        <div className="col-left">
          <div className="camera-card">
            <div className="camera-header">
              <h3>{demoMode ? "🧪 UI Simulation Mode" : "📷 Live Camera"}</h3>
              <div className="camera-controls">
                <button
                  className={`auto-btn ${demoMode ? "active" : ""}`}
                  onClick={() => {
                    const nextMode = !demoMode;
                    setDemoMode(nextMode);
                    setAutoDetect(false);
                    setStatus(nextMode ? "UI demo mode enabled" : "Live camera mode enabled");
                  }}
                >
                  {demoMode ? "Use Camera Mode" : "Use UI Demo"}
                </button>
                <button className={`detect-btn ${isDetecting ? "loading" : ""}`}
                  onClick={demoMode ? runDemoMode : runDetection}
                  disabled={isDetecting || (!backendOnline && !demoMode)}>
                  {demoMode ? "Apply Emotion" : isDetecting ? "⏳ Detecting..." : "🔍 Detect Now"}
                </button>
                <button className={`auto-btn ${autoDetect ? "active" : ""}`}
                  onClick={() => setAutoDetect((v) => !v)} disabled={!backendOnline || demoMode}>
                  {autoDetect ? "⏹ Stop Auto" : "▶ Auto Detect"}
                </button>
              </div>
            </div>
            <div className="webcam-wrapper">
              {demoMode ? (
                <div className="demo-panel">
                  <p className="demo-title">UI-only project mode</p>
                  <p className="demo-copy">No real equipment required. Pick an emotion and preview the full environment response.</p>
                  <div className="demo-controls">
                    <label htmlFor="emotion-select">Emotion</label>
                    <select
                      id="emotion-select"
                      className="music-select"
                      value={selectedEmotion}
                      onChange={(e) => setSelectedEmotion(e.target.value)}
                    >
                      {EMOTION_OPTIONS.map((emotionName) => (
                        <option key={emotionName} value={emotionName}>
                          {emotionName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="emotion-chip-grid">
                    {EMOTION_OPTIONS.map((emotionName) => (
                      <button
                        key={emotionName}
                        className={`emotion-chip ${selectedEmotion === emotionName ? "selected" : ""}`}
                        onClick={() => setSelectedEmotion(emotionName)}
                      >
                        {EMOTION_LABELS[emotionName]}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                  videoConstraints={{ facingMode: "user", width: 480, height: 360 }}
                  className="webcam-feed" mirrored={true} />
              )}
              {emotion && <div className="webcam-overlay">{emotion.toUpperCase()} · {confidence?.toFixed(0)}%</div>}
              {autoDetect && !demoMode && <div className="auto-indicator">● AUTO</div>}
            </div>
          </div>

          <EmotionDisplay emotion={emotion} confidence={confidence} allScores={allScores} intensity={intensity} />
          <FeedbackBar key={feedbackKey} sessionId={sessionId} emotion={emotion} action={action}
            onFeedbackDone={(r) => {
              refreshInsights();
              setStatus(`💬 Feedback: ${r} — system learning`);
            }} />
        </div>

        <div className="col-middle">
          <section className="story-strip compact">
            <div className="story-copy">
              <p className="eyebrow">Hackathon Demo Story</p>
              <h2>Emotion-aware intelligence that adapts the room in real time.</h2>
              <p className="story-text">
                This prototype senses emotion, recommends a smart environment response, learns from user feedback, and keeps running even when live AI is unavailable.
              </p>
            </div>
            <div className="story-metrics">
              <div className="metric-card">
                <span className="metric-label">System Mode</span>
                <strong>{systemModeLabel}</strong>
                <span className="metric-sub">{readinessLabel}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Current Emotion</span>
                <strong>{activeEmotionLabel}</strong>
                <span className="metric-sub">{activeConfidenceLabel}</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Intelligence Loop</span>
                <strong>{workflowTone}</strong>
                <span className="metric-sub">{runCount} demo runs this session</span>
              </div>
            </div>
          </section>

          <EnvironmentPanel action={currentAction} onOverride={handleOverride} />
        </div>

        <div className="col-right">
          <LearningLog />
        </div>
      </div>

      <section className="process-strip">
        {INTELLIGENCE_STEPS.map((step, index) => (
          <article key={step.title} className="process-card">
            <span className="process-index">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.detail}</p>
          </article>
        ))}
      </section>

      <section className="impact-strip">
        <article className="impact-card">
          <p className="eyebrow">Why This Action</p>
          <h3>{emotion ? `${EMOTION_LABELS[emotion]} response logic` : "Decision explainability"}</h3>
          <p className="impact-lead">
            {currentAction
              ? "The system combines emotion context with comfort-oriented rules and learned feedback."
              : "Run one detection or use demo mode to reveal the action reasoning."}
          </p>
          <div className="reason-list">
            {currentReasons.map((reason) => (
              <div key={reason} className="reason-item">{reason}</div>
            ))}
          </div>
        </article>

        <article className="impact-card">
          <p className="eyebrow">Learning Difference</p>
          <h3>Default vs current recommendation</h3>
          <p className="impact-lead">
            This view helps judges see whether the system is still using baseline rules or has started personalizing.
          </p>
          {comparisonRows.length === 0 ? (
            <p className="placeholder-text">No active recommendation yet.</p>
          ) : (
            <div className="compare-table">
              <div className="compare-head">Feature</div>
              <div className="compare-head">Default</div>
              <div className="compare-head">Current</div>
              {comparisonRows.map((row) => (
                <React.Fragment key={row.label}>
                  <div className="compare-cell compare-label">{row.label}</div>
                  <div className="compare-cell">{row.baseline}</div>
                  <div className="compare-cell compare-current">{row.current}</div>
                </React.Fragment>
              ))}
            </div>
          )}
        </article>

        <article className="impact-card">
          <p className="eyebrow">Impact Snapshot</p>
          <h3>Proof that the system is learning</h3>
          <p className="impact-lead">
            These metrics summarize user interaction and adaptation during the session.
          </p>
          <div className="mini-metrics">
            <div className="mini-metric">
              <span>Sessions tracked</span>
              <strong>{sessionsCount}</strong>
            </div>
            <div className="mini-metric">
              <span>Preferences stored</span>
              <strong>{preferencesCount}</strong>
            </div>
            <div className="mini-metric">
              <span>Locked preferences</span>
              <strong>{lockedCount}</strong>
            </div>
            <div className="mini-metric">
              <span>Most frequent mood</span>
              <strong>{topEmotion}</strong>
            </div>
          </div>
        </article>
      </section>

      <footer className="dash-footer">
        HackFusion 2K26 · Emotion-Aware Smart Environment · DeepFace + Flask + React
      </footer>
    </div>
  );
}
