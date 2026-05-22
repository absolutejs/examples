import { VOICE_ASSISTANT_CONFIG } from "../../../shared/demo";

export const AssistantConfigCard = () => (
  <article className="voice-card voice-assistant-config">
    <span className="voice-framework-pill">Assistant API</span>
    <h2>{VOICE_ASSISTANT_CONFIG.id}</h2>
    <p className="voice-footnote">
      Powered by createVoiceAssistant with a{" "}
      {VOICE_ASSISTANT_CONFIG.recipe} artifact plan.
    </p>
    <div className="voice-config-grid">
      <div>
        <div className="voice-assistant-label">Tools</div>
        <ul className="voice-compact-list">
          {VOICE_ASSISTANT_CONFIG.tools.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="voice-assistant-label">Guardrails</div>
        <ul className="voice-compact-list">
          {VOICE_ASSISTANT_CONFIG.guardrails.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="voice-assistant-label">Experiments</div>
        <ul className="voice-compact-list">
          {VOICE_ASSISTANT_CONFIG.experiments.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="voice-assistant-label">Artifacts</div>
        <ul className="voice-compact-list">
          {VOICE_ASSISTANT_CONFIG.artifacts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
    <p className="voice-footnote">
      <a href="/assistant">Open analytics</a> ·{" "}
      <a href="/tasks">Open tasks</a> ·{" "}
      <a href="/integrations">Open integration events</a>
      {" · "}
      <a href="/barge-in">Open barge-in proof</a>
    </p>
  </article>
);
