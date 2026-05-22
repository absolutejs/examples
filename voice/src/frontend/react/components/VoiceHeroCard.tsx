import {
  FRAMEWORK_DESCRIPTIONS,
  formatVoiceProfileSwitchGuardLabel,
  formatVoiceProfileSwitchGuardSummary,
  getVoiceModeLabel,
  getVoiceProviderLabel,
  getVoiceRoutingLabel,
  type VoiceDemoMode,
  type VoiceModelProvider,
  type VoiceProfileSwitchGuardClientDecision,
  type VoiceRoutingMode,
} from "../../../shared/demo";

type VoiceHeroCardProps = {
  activeMode: VoiceDemoMode | null;
  isConnected: boolean;
  modelProvider: VoiceModelProvider;
  profileSwitchGuardDecision: VoiceProfileSwitchGuardClientDecision | null;
  routingMode: VoiceRoutingMode;
  savedIntakeCount: number;
};

export const VoiceHeroCard = (props: VoiceHeroCardProps) => (
  <article className="voice-card voice-hero">
    <div className="voice-hero-layout">
      <div>
        <span className="voice-framework-pill">React Hook</span>
        <h2>Chat-style voice demo in React</h2>
        <p className="voice-brand-copy">{FRAMEWORK_DESCRIPTIONS.react}</p>
        <div className="voice-badges">
          <span className="voice-badge">Deepgram Flux</span>
          <span className="voice-badge">Phrase hint correction</span>
          <span className="voice-badge">Reconnect-aware sessions</span>
        </div>
      </div>
      <div className="voice-metrics">
        <div className="voice-metric">
          <span className="voice-metric-label">Connection</span>
          <span className="voice-metric-value">
            {props.isConnected ? "Connected" : "Waiting"}
          </span>
        </div>
        <div className="voice-metric">
          <span className="voice-metric-label">Scenario</span>
          <span className="voice-metric-value">
            {props.activeMode
              ? getVoiceModeLabel(props.activeMode)
              : "Choose one"}
          </span>
        </div>
        <div className="voice-metric">
          <span className="voice-metric-label">Saved captures</span>
          <span className="voice-metric-value">{props.savedIntakeCount}</span>
        </div>
        <div className="voice-metric">
          <span className="voice-metric-label">Model</span>
          <span className="voice-metric-value">
            {getVoiceProviderLabel(props.modelProvider)}
          </span>
        </div>
        <div className="voice-metric">
          <span className="voice-metric-label">Routing</span>
          <span className="voice-metric-value">
            {getVoiceRoutingLabel(props.routingMode)}
          </span>
        </div>
        <div className="voice-metric">
          <span className="voice-metric-label">Guarded profile</span>
          <span className="voice-metric-value">
            {formatVoiceProfileSwitchGuardLabel(
              props.profileSwitchGuardDecision,
            )}
          </span>
          <span className="voice-metric-label">
            {formatVoiceProfileSwitchGuardSummary(
              props.profileSwitchGuardDecision,
            )}
          </span>
        </div>
      </div>
    </div>
  </article>
);
