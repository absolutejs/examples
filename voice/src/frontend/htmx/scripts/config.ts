import { reloadWithVoiceSearchParam } from "../../shared/browser";
import {
  getInitialVoiceModelProvider,
  getInitialVoiceProfileId,
  getInitialVoiceRoutingMode,
  getInitialVoiceSpeechEngine,
  getVoiceProfileLabel,
  getVoiceProviderLabel,
  getVoiceRoutePath,
  getVoiceRoutingLabel,
  rememberVoiceModelProvider,
  rememberVoiceProfileId,
  rememberVoiceRoutingMode,
  rememberVoiceSpeechEngine,
  VOICE_PROFILES,
  type VoiceModelProvider,
  type VoiceProfileId,
  type VoiceRoutingMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

export const syncVoiceConfig = () => {
  const provider = getInitialVoiceModelProvider();
  const routing = getInitialVoiceRoutingMode();
  const profile = getInitialVoiceProfileId();
  const engine = getInitialVoiceSpeechEngine();
  const shell = document.querySelector("[data-voice-htmx]");
  const select = document.querySelector("#model-provider-select");
  const profileSelect = document.querySelector("#voice-profile-select");
  const metric = document.querySelector("#metric-provider");
  const routingSelect = document.querySelector("#routing-mode-select");
  const routingMetric = document.querySelector("#metric-routing");
  const routingModeCopy = document.querySelector("#routing-mode-copy");
  const engineSelect = document.querySelector("#speech-engine-select");

  if (shell instanceof HTMLElement) {
    shell.dataset.voiceGuidedPath = getVoiceRoutePath(
      "guided",
      provider,
      routing,
      engine,
      profile,
    );
    shell.dataset.voiceGeneralPath = getVoiceRoutePath(
      "general",
      provider,
      routing,
      engine,
      profile,
    );
  }
  if (select instanceof HTMLSelectElement) {
    select.value = provider;
    select.addEventListener("change", () => {
      rememberVoiceModelProvider(select.value as VoiceModelProvider);
      reloadWithVoiceSearchParam("provider", select.value);
    });
  }
  if (profileSelect instanceof HTMLSelectElement) {
    profileSelect.value = profile;
    profileSelect.addEventListener("change", () => {
      rememberVoiceProfileId(profileSelect.value as VoiceProfileId);
      reloadWithVoiceSearchParam("voiceProfile", profileSelect.value);
    });
  }
  if (routingSelect instanceof HTMLSelectElement) {
    routingSelect.value = routing;
    routingSelect.addEventListener("change", () => {
      rememberVoiceRoutingMode(routingSelect.value as VoiceRoutingMode);
      reloadWithVoiceSearchParam("routing", routingSelect.value);
    });
  }
  if (engineSelect instanceof HTMLSelectElement) {
    engineSelect.value = engine;
    engineSelect.addEventListener("change", () => {
      rememberVoiceSpeechEngine(engineSelect.value as VoiceSpeechEngine);
      reloadWithVoiceSearchParam("engine", engineSelect.value);
    });
  }
  if (metric instanceof HTMLElement) {
    metric.textContent = getVoiceProviderLabel(provider);
  }
  if (routingMetric instanceof HTMLElement) {
    routingMetric.textContent = getVoiceRoutingLabel(routing);
  }
  if (routingModeCopy instanceof HTMLElement) {
    routingModeCopy.textContent = `${getVoiceProfileLabel(profile)} uses ${
      VOICE_PROFILES.find((item) => item.id === profile)?.description ??
      "the selected real-call defaults."
    }`;
  }
};
