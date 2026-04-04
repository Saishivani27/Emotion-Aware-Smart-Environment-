import React, { useState } from "react";
import { submitFeedback } from "../api/apiService";

export default function FeedbackBar({ sessionId, emotion, action, onFeedbackDone }) {
  const [submitted, setSubmitted] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!sessionId) return null;

  async function handleFeedback(rating) {
    setSubmitting(true);
    setError(null);
    try {
      await submitFeedback(sessionId, emotion, action, rating);
      setSubmitted(rating);
      onFeedbackDone && onFeedbackDone(rating);
    } catch {
      setError("Could not save feedback. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const submittedMessage = {
      thumbsup: "Positive feedback saved. Preference strength increased.",
      thumbsdown: "Negative feedback saved. The system will avoid repeating this mistake.",
      skip: "Skip saved as a signal. Weak recommendations will be reduced next time.",
    };
    return (
      <div className="feedback-bar submitted">
        <span>✅ {submittedMessage[submitted] || "Feedback saved! System is learning..."}</span>
      </div>
    );
  }

  return (
    <div className="feedback-bar">
      <span className="feedback-prompt">Was this environment choice good?</span>
      <div className="feedback-buttons">
        <button className="fb-btn thumbsup" onClick={() => handleFeedback("thumbsup")} disabled={submitting}>👍</button>
        <button className="fb-btn thumbsdown" onClick={() => handleFeedback("thumbsdown")} disabled={submitting}>👎</button>
        <button className="fb-btn skip" onClick={() => handleFeedback("skip")} disabled={submitting}>⏭ Skip</button>
      </div>
      {error && <p className="feedback-error">{error}</p>}
    </div>
  );
}
