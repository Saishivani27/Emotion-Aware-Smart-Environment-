const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const LOCAL_SESSIONS_KEY = "emotion-smart-env-sessions";
const LOCAL_PREFERENCES_KEY = "emotion-smart-env-preferences";

const DEFAULT_ACTIONS = {
  happy: {
    emotion: "happy",
    light_color: "#FFD700",
    fan_speed: "medium",
    music_genre: "Upbeat Pop",
    notifications_on: true,
    light_label: "Warm Yellow",
    display_brightness: 82,
    description: "Energetic and bright to match your mood!",
    fan_level: 66,
    music_url: "https://open.spotify.com/embed/playlist/37i9dQZF1DXdPec7aLTmlC",
  },
  sad: {
    emotion: "sad",
    light_color: "#4A90D9",
    fan_speed: "low",
    music_genre: "Calm Acoustic",
    notifications_on: false,
    light_label: "Soft Blue",
    display_brightness: 48,
    description: "Gentle environment to keep you calm and supported.",
    fan_level: 33,
    music_url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX504r1DvyvxG",
  },
  stressed: {
    emotion: "stressed",
    light_color: "#E0F0FF",
    fan_speed: "high",
    music_genre: "Lo-fi / Ambient",
    notifications_on: false,
    light_label: "Cool White",
    display_brightness: 55,
    description: "Cooling distraction-free environment to ease stress.",
    fan_level: 100,
    music_url: "https://open.spotify.com/embed/playlist/0vvXsWCC9xrXsKd4edens3",
  },
  angry: {
    emotion: "angry",
    light_color: "#8B0000",
    fan_speed: "high",
    music_genre: "None",
    notifications_on: false,
    light_label: "Deep Red",
    display_brightness: 35,
    description: "Silence and dim lighting to help you cool down.",
    fan_level: 100,
    music_url: null,
  },
  neutral: {
    emotion: "neutral",
    light_color: "#F5F5DC",
    fan_speed: "medium",
    music_genre: "Light Jazz",
    notifications_on: true,
    light_label: "Daylight",
    display_brightness: 68,
    description: "Balanced environment for a comfortable session.",
    fan_level: 66,
    music_url: "https://open.spotify.com/embed/playlist/37i9dQZF1DXbITWG1ZJKYt",
  },
  surprised: {
    emotion: "surprised",
    light_color: "#FFFFFF",
    fan_speed: "medium",
    music_genre: "Upbeat",
    notifications_on: true,
    light_label: "Bright White",
    display_brightness: 88,
    description: "Bright and alert to match your energy.",
    fan_level: 66,
    music_url: "https://open.spotify.com/embed/playlist/37i9dQZF1DX3rxVfibe1L0",
  },
  tired: {
    emotion: "tired",
    light_color: "#FF8C00",
    fan_speed: "low",
    music_genre: "Soft Instrumental",
    notifications_on: false,
    light_label: "Dim Orange",
    display_brightness: 42,
    description: "Warm dim lighting and soft music to help you rest.",
    fan_level: 33,
    music_url: "https://open.spotify.com/embed/playlist/37i9dQZF1DWZqd5JICZI0u",
  },
};

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function getLocalSessions() {
  return readJson(LOCAL_SESSIONS_KEY, []);
}

function saveLocalSessions(sessions) {
  writeJson(LOCAL_SESSIONS_KEY, sessions);
}

function getLocalPreferencesStore() {
  return readJson(LOCAL_PREFERENCES_KEY, {});
}

function saveLocalPreferencesStore(preferences) {
  writeJson(LOCAL_PREFERENCES_KEY, preferences);
}

function buildLocalAction(emotion) {
  const base = DEFAULT_ACTIONS[emotion] || DEFAULT_ACTIONS.neutral;
  const preference = getLocalPreferencesStore()[emotion];

  if (preference && preference.positive_count >= 2) {
    return {
      ...base,
      ...preference,
      emotion,
      fan_level: fanLevelFor(preference.fan_speed || base.fan_speed),
      is_personalized: true,
      source: "ui-demo",
      learning_state: "locked_preference",
      description: `UI demo learned this preference from ${preference.positive_count} positive feedback entries.`,
    };
  }

  if (
    preference &&
    (((preference.negative_count || 0) >= 2) || ((preference.skip_count || 0) >= 2)) &&
    (preference.positive_count || 0) <= (preference.negative_count || 0)
  ) {
    const saferFan = base.fan_speed === "high" ? "low" : base.fan_speed;
    return {
      ...base,
      emotion,
      music_genre: "None",
      music_url: null,
      notifications_on: false,
      fan_speed: saferFan,
      fan_level: fanLevelFor(saferFan),
      display_brightness: Math.min(base.display_brightness || 70, 55),
      is_personalized: true,
      source: "ui-demo",
      learning_state: "avoid_repeat",
      description: `UI demo is avoiding repeat mistakes after ${preference.negative_count || 0} negative and ${preference.skip_count || 0} skipped responses.`,
    };
  }

  return {
    ...base,
    emotion,
    is_personalized: false,
    source: "ui-demo",
    learning_state: "collecting_feedback",
    positive_count: preference?.positive_count || 0,
    negative_count: preference?.negative_count || 0,
    skip_count: preference?.skip_count || 0,
  };
}

export function getBaselineAction(emotion) {
  const base = DEFAULT_ACTIONS[emotion] || DEFAULT_ACTIONS.neutral;
  return { ...base, emotion, is_personalized: false, source: "baseline" };
}

function fanLevelFor(speed) {
  return { off: 0, low: 33, medium: 66, high: 100 }[speed] ?? 66;
}

function createScoreMap(emotion, confidence) {
  const scores = Object.keys(DEFAULT_ACTIONS).reduce((acc, key) => {
    acc[key] = key === emotion ? confidence : 0;
    return acc;
  }, {});
  return scores;
}

export function createLocalDemoSession(emotion, confidence = 100) {
  const action = buildLocalAction(emotion);
  const sessionId = Date.now();
  const sessions = getLocalSessions();
  sessions.unshift({
    id: sessionId,
    timestamp: new Date().toISOString(),
    emotion,
    confidence,
    light_color: action.light_color,
    fan_speed: action.fan_speed,
    music_genre: action.music_genre,
    notifications_on: action.notifications_on ? 1 : 0,
    display_brightness: action.display_brightness,
    rating: null,
    source: "ui-demo",
  });
  saveLocalSessions(sessions.slice(0, 50));

  return {
    emotion,
    confidence,
    all_scores: createScoreMap(emotion, confidence),
    action,
    session_id: sessionId,
    detection_error: "Using local UI simulation mode",
  };
}

export async function detectEmotion(base64Image) {
  try {
    const response = await fetch(`${BASE_URL}/detect-emotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });
    if (!response.ok) throw new Error(`Detection failed: ${response.status}`);
    return response.json();
  } catch {
    const emotions = Object.keys(DEFAULT_ACTIONS);
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    return createLocalDemoSession(emotion, 76);
  }
}

export async function getAction(emotion) {
  try {
    const response = await fetch(`${BASE_URL}/get-action?emotion=${emotion}`);
    if (!response.ok) throw new Error(`Get action failed: ${response.status}`);
    return response.json();
  } catch {
    return { emotion, action: buildLocalAction(emotion), source: "ui-demo" };
  }
}

export async function submitFeedback(sessionId, emotion, action, rating) {
  if (action?.source === "ui-demo") {
    return saveFeedbackLocally(sessionId, emotion, action, rating);
  }

  try {
    const response = await fetch(`${BASE_URL}/submit-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, emotion, action, rating }),
    });
    if (!response.ok) throw new Error(`Feedback failed: ${response.status}`);
    return response.json();
  } catch {
    return saveFeedbackLocally(sessionId, emotion, action, rating);
  }
}

export async function getPreferences() {
  const localPreferences = Object.values(getLocalPreferencesStore());

  try {
    const response = await fetch(`${BASE_URL}/get-preferences`);
    if (!response.ok) throw new Error(`Get preferences failed: ${response.status}`);
    const remote = await response.json();
    const preferences = mergePreferences(remote.preferences || [], localPreferences);
    return { preferences, count: preferences.length };
  } catch {
    const preferences = localPreferences.sort(
      (a, b) => new Date(b.last_updated) - new Date(a.last_updated)
    );
    return { preferences, count: preferences.length, source: "ui-demo" };
  }
}

export async function overrideDevice(device, value) {
  try {
    const response = await fetch(`${BASE_URL}/override-device`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device, value }),
    });
    if (!response.ok) throw new Error(`Override failed: ${response.status}`);
    return response.json();
  } catch {
    return { device, value, status: "overridden locally", source: "ui-demo" };
  }
}

export async function getRecentSessions(limit = 15) {
  const localSessions = getLocalSessions();

  try {
    const response = await fetch(`${BASE_URL}/recent-sessions?limit=${limit}`);
    if (!response.ok) throw new Error(`Sessions fetch failed: ${response.status}`);
    const remote = await response.json();
    const sessions = mergeSessions(remote.sessions || [], localSessions).slice(0, limit);
    return { sessions, count: sessions.length };
  } catch {
    const sessions = localSessions.slice(0, limit);
    return { sessions, count: sessions.length, source: "ui-demo" };
  }
}

export async function checkHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function saveFeedbackLocally(sessionId, emotion, action, rating) {
  const sessions = getLocalSessions().map((session) =>
    session.id === sessionId ? { ...session, rating } : session
  );
  saveLocalSessions(sessions);

    const preferences = getLocalPreferencesStore();
    const current = preferences[emotion] || {
      emotion,
      light_color: action.light_color,
      fan_speed: action.fan_speed,
      music_genre: action.music_genre,
      notifications_on: action.notifications_on,
      display_brightness: action.display_brightness,
      positive_count: 0,
      negative_count: 0,
      skip_count: 0,
      last_updated: new Date().toISOString(),
    };

    const nextPreference = {
      ...current,
      light_color: action.light_color,
      fan_speed: action.fan_speed,
      music_genre: action.music_genre,
      notifications_on: action.notifications_on,
      display_brightness: action.display_brightness,
      positive_count: current.positive_count + (rating === "thumbsup" ? 1 : 0),
      negative_count: current.negative_count + (rating === "thumbsdown" ? 1 : 0),
      skip_count: current.skip_count + (rating === "skip" ? 1 : 0),
      last_feedback: rating,
      last_updated: new Date().toISOString(),
      source: "ui-demo",
    };

    preferences[emotion] = nextPreference;
    saveLocalPreferencesStore(preferences);

    return { status: "feedback recorded locally", rating, emotion, source: "ui-demo" };
}

function mergeSessions(remoteSessions, localSessions) {
  const keyed = new Map();
  [...remoteSessions, ...localSessions].forEach((session) => {
    if (!session || session.id == null) return;
    keyed.set(`session-${session.id}-${session.source || "backend"}`, session);
  });
  return Array.from(keyed.values()).sort(
    (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
  );
}

function mergePreferences(remotePreferences, localPreferences) {
  const merged = new Map();

  remotePreferences.forEach((pref) => {
    if (!pref?.emotion) return;
    merged.set(pref.emotion, { ...pref, source: pref.source || "backend" });
  });

  localPreferences.forEach((pref) => {
    if (!pref?.emotion) return;
    const existing = merged.get(pref.emotion);
    if (!existing) {
      merged.set(pref.emotion, { ...pref, source: pref.source || "ui-demo" });
      return;
    }

      merged.set(pref.emotion, {
        ...existing,
        ...pref,
        positive_count: (existing.positive_count || 0) + (pref.positive_count || 0),
        negative_count: (existing.negative_count || 0) + (pref.negative_count || 0),
        skip_count: (existing.skip_count || 0) + (pref.skip_count || 0),
        last_feedback: pref.last_feedback || existing.last_feedback,
        last_updated: newerDate(existing.last_updated, pref.last_updated),
        source: "merged",
      });
  });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.last_updated || 0) - new Date(a.last_updated || 0)
  );
}

function newerDate(first, second) {
  return new Date(first || 0) > new Date(second || 0) ? first : second;
}
