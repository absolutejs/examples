import { getVoiceSpeechEngineSampleRate } from "../../../shared/demo";
import {
  VOICE_MODEL_PROVIDERS,
  VOICE_PROFILES,
  VOICE_ROUTING_MODES,
  VOICE_SPEECH_ENGINES,
} from "../../../constants/voiceOptions";
import type {
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";

type VoicePipelineCardProps = {
  changeModelProvider: (provider: VoiceModelProvider) => void;
  changeProfileId: (profileId: VoiceProfileId) => void;
  changeRoutingMode: (routing: VoiceRoutingMode) => void;
  changeSpeechEngine: (engine: VoiceSpeechEngine) => void;
  isConnected: boolean;
  modelProvider: VoiceModelProvider;
  profileId: VoiceProfileId;
  routingMode: VoiceRoutingMode;
  speechEngine: VoiceSpeechEngine;
};

export const VoicePipelineCard = (props: VoicePipelineCardProps) => {
  const isRealtime = props.speechEngine === "openai-realtime";
  const sampleRateKHz = Math.round(
    getVoiceSpeechEngineSampleRate(props.speechEngine) / 1000,
  );

  return (
    <article className="voice-card voice-pipeline-card">
      <header className="voice-pipeline-head">
        <div>
          <span className="voice-framework-pill">AbsoluteJS Voice · React</span>
          <h1 className="voice-pipeline-title">Speak. It speaks back.</h1>
          <p className="voice-brand-copy">
            One open-source voice pipeline — Speech-to-Text, your LLM, and
            Text-to-Speech. Choose each stage, then start talking.
          </p>
        </div>
        <span
          className={`voice-conn${props.isConnected ? " is-on" : ""}`}
          title="Live voice connection"
        >
          <span className="voice-conn-dot" />
          {props.isConnected ? "Connected" : "Idle"}
        </span>
      </header>

      <div
        aria-label="Speech engine"
        className="voice-engine-toggle"
        role="group"
      >
        {VOICE_SPEECH_ENGINES.map((engine) => (
          <button
            aria-pressed={props.speechEngine === engine.id} className={props.speechEngine === engine.id ? "is-active" : ""} key={engine.id} onClick={() => props.changeSpeechEngine(engine.id)} type="button"
          >
            {engine.label}
          </button>
        ))}
      </div>

      <div className="voice-pipeline">
        <section className="voice-stage voice-stage--stt">
          <span className="voice-stage-step">1 · Speech → Text</span>
          {isRealtime ? (
            <p className="voice-stage-note">
              Folded into OpenAI Realtime (direct speech-to-speech).
            </p>
          ) : (
            <>
              <p className="voice-stage-providers">
                Deepgram <small>primary</small> · AssemblyAI{" "}
                <small>fallback</small>
              </p>
              <label className="voice-stage-control">
                <span>Routing</span>
                <select
                  onChange={(event) =>
                    props.changeRoutingMode(
                      event.currentTarget.value as VoiceRoutingMode,
                    )
                  }
                  value={props.routingMode}
                >
                  {VOICE_ROUTING_MODES.map((routing) => (
                    <option key={routing.id} value={routing.id}>
                      {routing.label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </section>

        <span aria-hidden="true" className="voice-pipeline-arrow">
          →
        </span>

        <section className="voice-stage voice-stage--llm">
          <span className="voice-stage-step">2 · Assistant</span>
          <label className="voice-stage-control">
            <span>Model</span>
            <select
              onChange={(event) =>
                props.changeModelProvider(
                  event.currentTarget.value as VoiceModelProvider,
                )
              }
              value={props.modelProvider}
            >
              {VOICE_MODEL_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>
          <label className="voice-stage-control">
            <span>Profile</span>
            <select
              onChange={(event) =>
                props.changeProfileId(
                  event.currentTarget.value as VoiceProfileId,
                )
              }
              value={props.profileId}
            >
              {VOICE_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <span aria-hidden="true" className="voice-pipeline-arrow">
          →
        </span>

        <section className="voice-stage voice-stage--tts">
          <span className="voice-stage-step">3 · Text → Speech</span>
          <p className="voice-stage-providers">
            OpenAI <small>{sampleRateKHz} kHz</small>
          </p>
          <p className="voice-stage-note">
            {isRealtime
              ? "Realtime voice output."
              : "Streamed TTS with emergency fallback."}
          </p>
        </section>
      </div>
    </article>
  );
};
