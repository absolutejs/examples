import type { useVoiceStream } from "@absolutejs/voice/react";
import {
  getVoiceModeLabel,
  VOICE_CALL_CONTROL_ACTIONS,
  VOICE_DEMO_GENERAL_LABEL,
  VOICE_DEMO_GUIDED_LABEL,
  VOICE_DEMO_MIC_IDLE,
  VOICE_DEMO_MIC_LIVE,
  VOICE_DEMO_STOP_LABEL,
  type SavedIntake,
  type VoiceDemoMode,
} from "../../../shared/demo";

type ConversationVoice = ReturnType<typeof useVoiceStream<SavedIntake>>;

type ConversationCardProps = {
  activeMode: VoiceDemoMode | null;
  call: ConversationVoice["call"];
  currentPrompt: string;
  errorMessage: string;
  isCapturing: boolean;
  leadMessage: string;
  partial: string;
  reconnectLabel: string;
  runCallControl: (action: (typeof VOICE_CALL_CONTROL_ACTIONS)[number]) => void;
  startMode: (mode: VoiceDemoMode) => Promise<void>;
  status: string;
  stopMic: () => void;
  turns: ConversationVoice["turns"];
  voiceWavePath: string;
};

export const ConversationCard = (props: ConversationCardProps) => (
  <article className="voice-card voice-card-wide">
    <h2>Conversation</h2>
    <div className="voice-status-list">
      <div className="status-row">
        <span className="label">Voice status</span>
        <span className="value">{props.status}</span>
      </div>
      <div className="status-row">
        <span className="label">Reconnect</span>
        <span className="value">{props.reconnectLabel}</span>
      </div>
      <div className="status-row">
        <span className="label">Current prompt</span>
        <span className="value">{props.currentPrompt}</span>
      </div>
      <div className="status-row">
        <span className="label">Microphone</span>
        <span className="value">
          {props.isCapturing ? VOICE_DEMO_MIC_LIVE : VOICE_DEMO_MIC_IDLE}
        </span>
      </div>
      <div className="status-row">
        <span className="label">Current utterance</span>
        <span className="value">
          {props.partial || "No speech captured yet"}
        </span>
      </div>
      <div className="status-row">
        <span className="label">Errors</span>
        <span className="value">{props.errorMessage}</span>
      </div>
      <div className="status-row">
        <span className="label">Call lifecycle</span>
        <span className="value">
          {props.call?.disposition
            ? `${props.call.disposition} after ${props.call.events.length} lifecycle event${props.call.events.length === 1 ? "" : "s"}`
            : (props.call?.events.at(-1)?.type ?? "Not started")}
        </span>
      </div>
    </div>
    <div className="voice-chat-list">
      <article className="voice-chat-message assistant">
        <div className="voice-chat-role">
          {props.activeMode
            ? getVoiceModeLabel(props.activeMode)
            : "Voice demo"}
        </div>
        <p className="voice-turn-text">{props.leadMessage}</p>
      </article>
      {props.turns.map((turn) => (
        <div className="voice-chat-stack" key={turn.id}>
          <article className="voice-chat-message user">
            <div className="voice-chat-role">You</div>
            <p className="voice-turn-text">{turn.text}</p>
          </article>
          {turn.assistantText ? (
            <article className="voice-chat-message assistant">
              <div className="voice-chat-role">
                {props.activeMode
                  ? getVoiceModeLabel(props.activeMode)
                  : "Guide"}
              </div>
              <p className="voice-turn-text">{turn.assistantText}</p>
            </article>
          ) : null}
        </div>
      ))}
      {props.partial ? (
        <article className="voice-chat-message user pending">
          <div className="voice-chat-role">Speaking</div>
          <p className="voice-turn-text">{props.partial}</p>
        </article>
      ) : null}
    </div>
    <div className={`voice-monitor${props.isCapturing ? " is-live" : ""}`}>
      <div className="voice-monitor-header">
        <span className="voice-monitor-label">Input monitor</span>
        <span
          className={`voice-live-pill${props.isCapturing ? " is-live" : ""}`}
        >
          <span className="voice-live-dot" />
          {props.isCapturing ? "Microphone live" : "Microphone idle"}
        </span>
      </div>
      <svg
        aria-label="Microphone waveform"
        className="voice-wave"
        viewBox="0 0 320 88"
      >
        <path className="voice-wave-baseline" d="M 0 44 L 320 44" />
        <path className="voice-wave-glow" d={props.voiceWavePath} />
        <path className="voice-wave-line" d={props.voiceWavePath} />
      </svg>
    </div>
    <div className="voice-actions">
      {props.isCapturing ? (
        <button className="primary" onClick={() => void props.stopMic()}>
          {VOICE_DEMO_STOP_LABEL}
        </button>
      ) : (
        <>
          <button
            className="primary"
            onClick={() => void props.startMode("guided")}
          >
            {VOICE_DEMO_GUIDED_LABEL}
          </button>
          <button onClick={() => void props.startMode("general")}>
            {VOICE_DEMO_GENERAL_LABEL}
          </button>
        </>
      )}
    </div>
    <div className="voice-actions">
      {VOICE_CALL_CONTROL_ACTIONS.map((action) => (
        <button
          key={action.action}
          type="button"
          onClick={() => props.runCallControl(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
    <p className="voice-footnote">
      This demo uses the dev-only in-memory voice session store. Real
      deployments should replace it with Redis or Postgres.
    </p>
  </article>
);
