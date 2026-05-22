import {
  getVoiceProfileLabel,
  VOICE_MODEL_PROVIDERS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  VOICE_SPEECH_ENGINES,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

type ProviderConfigCardProps = {
  changeModelProvider: (provider: VoiceModelProvider) => void;
  changeProfileId: (nextProfileId: VoiceProfileId) => void;
  changeRoutingMode: (routing: VoiceRoutingMode) => void;
  changeSpeechEngine: (engine: VoiceSpeechEngine) => void;
  modelProvider: VoiceModelProvider;
  profileId: VoiceProfileId;
  routingMode: VoiceRoutingMode;
  speechEngine: VoiceSpeechEngine;
};

export const ProviderConfigCard = (props: ProviderConfigCardProps) => (
  <article className="voice-card voice-provider-card">
    <span className="voice-framework-pill">Model Provider</span>
    <h2>Choose the assistant brain</h2>
    <p className="voice-footnote">
      Switch providers before starting the microphone. The voice route receives
      the selected provider on every session.
    </p>
    <label className="voice-provider-select">
      <span>Provider</span>
      <select
        value={props.modelProvider}
        onChange={(event) =>
          props.changeModelProvider(
            event.currentTarget.value as VoiceModelProvider,
          )
        }
      >
        {VOICE_MODEL_PROVIDERS.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.label}
          </option>
        ))}
      </select>
    </label>
    <label className="voice-provider-select">
      <span>Voice profile</span>
      <select
        value={props.profileId}
        onChange={(event) =>
          props.changeProfileId(event.currentTarget.value as VoiceProfileId)
        }
      >
        {VOICE_PROFILES.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.label}
          </option>
        ))}
      </select>
    </label>
    <label className="voice-provider-select">
      <span>STT routing</span>
      <select
        value={props.routingMode}
        onChange={(event) =>
          props.changeRoutingMode(event.currentTarget.value as VoiceRoutingMode)
        }
      >
        {VOICE_ROUTING_MODES.map((routing) => (
          <option key={routing.id} value={routing.id}>
            {routing.label}
          </option>
        ))}
      </select>
    </label>
    <label className="voice-provider-select">
      <span>Speech engine</span>
      <select
        value={props.speechEngine}
        onChange={(event) =>
          props.changeSpeechEngine(
            event.currentTarget.value as VoiceSpeechEngine,
          )
        }
      >
        {VOICE_SPEECH_ENGINES.map((engine) => (
          <option key={engine.id} value={engine.id}>
            {engine.label}
          </option>
        ))}
      </select>
    </label>
    <p className="voice-footnote">
      {getVoiceProfileLabel(props.profileId)} uses{" "}
      {VOICE_PROFILES.find((item) => item.id === props.profileId)
        ?.description ?? "the selected real-call defaults."}
    </p>
  </article>
);
