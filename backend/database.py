"""
database.py
Handles all SQLite database setup and query functions.
Tables: sessions (emotion logs), preferences (learned user prefs), feedback
"""

import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "emotion_env.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            emotion TEXT NOT NULL,
            confidence REAL NOT NULL,
            light_color TEXT,
            fan_speed TEXT,
            music_genre TEXT,
            notifications_on INTEGER,
            display_brightness INTEGER
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            rating TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS preferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emotion TEXT NOT NULL UNIQUE,
            light_color TEXT,
            fan_speed TEXT,
            music_genre TEXT,
            notifications_on INTEGER,
            display_brightness INTEGER,
            positive_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            skip_count INTEGER DEFAULT 0,
            last_feedback TEXT,
            last_updated TEXT
        )
    """)

    _ensure_column(cursor, "sessions", "display_brightness", "INTEGER")
    _ensure_column(cursor, "preferences", "display_brightness", "INTEGER")
    _ensure_column(cursor, "preferences", "positive_count", "INTEGER DEFAULT 0")
    _ensure_column(cursor, "preferences", "negative_count", "INTEGER DEFAULT 0")
    _ensure_column(cursor, "preferences", "skip_count", "INTEGER DEFAULT 0")
    _ensure_column(cursor, "preferences", "last_feedback", "TEXT")
    _ensure_column(cursor, "preferences", "last_updated", "TEXT")

    conn.commit()
    conn.close()


def _ensure_column(cursor, table_name, column_name, column_definition):
    cursor.execute(f"PRAGMA table_info({table_name})")
    existing_columns = {row[1] for row in cursor.fetchall()}
    if column_name not in existing_columns:
        cursor.execute(
            f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}"
        )


def save_session(emotion, confidence, action):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO sessions 
        (timestamp, emotion, confidence, light_color, fan_speed, music_genre, notifications_on, display_brightness)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        datetime.now().isoformat(),
        emotion,
        confidence,
        action.get("light_color"),
        action.get("fan_speed"),
        action.get("music_genre"),
        1 if action.get("notifications_on") else 0,
        action.get("display_brightness")
    ))
    session_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return session_id


def save_feedback(session_id, rating):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO feedback (session_id, rating, timestamp)
        VALUES (?, ?, ?)
    """, (session_id, rating, datetime.now().isoformat()))
    conn.commit()
    conn.close()


def update_preferences(emotion, action, rating):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM preferences WHERE emotion = ?", (emotion,))
    row = cursor.fetchone()

    if row is None:
        cursor.execute("""
            INSERT INTO preferences 
            (emotion, light_color, fan_speed, music_genre, notifications_on, display_brightness,
             positive_count, negative_count, skip_count, last_feedback, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            emotion,
            action.get("light_color"),
            action.get("fan_speed"),
            action.get("music_genre"),
            1 if action.get("notifications_on") else 0,
            action.get("display_brightness"),
            1 if rating == "thumbsup" else 0,
            1 if rating == "thumbsdown" else 0,
            1 if rating == "skip" else 0,
            rating,
            datetime.now().isoformat()
        ))
    else:
        pos = row["positive_count"] + (1 if rating == "thumbsup" else 0)
        neg = row["negative_count"] + (1 if rating == "thumbsdown" else 0)
        skip = row["skip_count"] + (1 if rating == "skip" else 0)

        if rating == "thumbsup" and pos >= 2 and pos > neg:
            cursor.execute("""
                UPDATE preferences
                SET light_color=?, fan_speed=?, music_genre=?, notifications_on=?, display_brightness=?,
                    positive_count=?, negative_count=?, skip_count=?, last_feedback=?, last_updated=?
                WHERE emotion=?
            """, (
                action.get("light_color"),
                action.get("fan_speed"),
                action.get("music_genre"),
                1 if action.get("notifications_on") else 0,
                action.get("display_brightness"),
                pos, neg, skip, rating,
                datetime.now().isoformat(),
                emotion
            ))
        else:
            cursor.execute("""
                UPDATE preferences
                SET positive_count=?, negative_count=?, skip_count=?, last_feedback=?, last_updated=?
                WHERE emotion=?
            """, (pos, neg, skip, rating, datetime.now().isoformat(), emotion))

    conn.commit()
    conn.close()


def get_preferences():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM preferences ORDER BY last_updated DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_preference_for_emotion(emotion):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM preferences WHERE emotion = ?", (emotion,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_recent_sessions(limit=20):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT s.*, f.rating FROM sessions s
        LEFT JOIN feedback f ON f.session_id = s.id
        ORDER BY s.timestamp DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]
