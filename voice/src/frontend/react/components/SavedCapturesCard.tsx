import { formatDateTime } from "../../shared/browser";
import {
  getVoiceModeLabel,
  type SavedIntake,
} from "../../../shared/demo";

type SavedCapturesCardProps = {
  savedIntakes: SavedIntake[];
};

export const SavedCapturesCard = (props: SavedCapturesCardProps) => (
  <article className="voice-card voice-hero">
    <h2>Saved captures</h2>
    <p className="voice-footnote">
      Open <a href="/reviews/latest">the latest review</a> or{" "}
      <a href="/reviews">browse all reviews</a> after a completed demo call.
    </p>
    <div className="voice-saved-list">
      {props.savedIntakes.length === 0 ? (
        <p className="empty-copy">No saved captures yet.</p>
      ) : (
        props.savedIntakes.map((intake) => (
          <article className="saved-item" key={intake.id}>
            <div className="saved-item-header">
              <strong>{intake.title}</strong>
              <span>{formatDateTime(intake.completedAt)}</span>
            </div>
            <div className="saved-item-meta">
              <span className="pill">
                {getVoiceModeLabel(intake.scenarioId)}
              </span>
              <span className="pill">
                {intake.turnCount} turn
                {intake.turnCount === 1 ? "" : "s"}
              </span>
              {intake.detectedName ? (
                <span className="pill">{intake.detectedName}</span>
              ) : null}
            </div>
            <div className="saved-answer-list">
              {intake.promptAnswers.map((entry) => (
                <div className="saved-answer" key={entry.prompt}>
                  <div className="saved-answer-label">{entry.prompt}</div>
                  <p className="saved-answer-text">{entry.response}</p>
                </div>
              ))}
            </div>
            <div className="voice-assistant-label">Full transcript</div>
            <p>{intake.transcript}</p>
            <p className="saved-summary">{intake.assistantSummary}</p>
          </article>
        ))
      )}
    </div>
  </article>
);
