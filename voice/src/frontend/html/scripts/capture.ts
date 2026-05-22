import {
  createDemoBargeInEvidence,
  createDemoLiveTurnLatencyEvidence,
  createDemoMicrophone,
  createInitialVoiceWaveLevels,
  createVoiceWavePath,
  formatErrorMessage,
  pushVoiceWaveLevel,
  renderDemoLiveTurnLatencyHTML,
} from "../../shared/browser";
import {
  getVoiceSpeechEngineSampleRate,
  type VoiceDemoMode,
  type VoiceSpeechEngine,
} from "../../../shared/demo";
import type { VoiceDemoElements } from "./dom";
import type { VoiceDemoStream } from "./streams";

type CaptureControllerInput = {
  currentVoice: () => VoiceDemoStream;
  elements: VoiceDemoElements;
  onRender: () => void;
  onStarted: (mode: VoiceDemoMode) => void;
  speechEngine: VoiceSpeechEngine;
};

export const createCaptureController = (input: CaptureControllerInput) => {
  const { currentVoice, elements, onRender, onStarted, speechEngine } = input;
  const bargeInEvidence = createDemoBargeInEvidence(() => currentVoice());
  const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() =>
    currentVoice(),
  );
  let isCapturing = false;
  let micError: string | null = null;
  let waveLevels = createInitialVoiceWaveLevels();

  const renderWave = () => {
    const path = createVoiceWavePath(waveLevels);
    elements.voiceWaveGlow.setAttribute("d", path);
    elements.voiceWavePath.setAttribute("d", path);
    elements.voiceMonitorCopy.innerHTML = `<span class="voice-live-dot"></span>${
      isCapturing ? "Microphone live" : "Microphone idle"
    }`;
    elements.voiceMonitorCopy.classList.toggle("is-live", isCapturing);
    elements.voiceMonitor.classList.toggle("is-live", isCapturing);
  };

  const microphone = createDemoMicrophone(
    (audio) => {
      liveLatencyEvidence.recordAudio(audio);
      elements.liveLatencyProofHost.innerHTML = renderDemoLiveTurnLatencyHTML(
        liveLatencyEvidence.getSnapshot(),
      );
      bargeInEvidence.sendAudio(audio);
    },
    (level) => {
      waveLevels = pushVoiceWaveLevel(waveLevels, level);
      renderWave();
    },
    {
      sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine),
    },
  );

  const renderLiveLatency = () => {
    elements.liveLatencyProofHost.innerHTML = renderDemoLiveTurnLatencyHTML(
      liveLatencyEvidence.getSnapshot(),
    );
  };

  const syncAssistantOutput = () => {
    bargeInEvidence.syncAssistantOutput();
    liveLatencyEvidence.syncAssistantOutput();
  };

  const stopMicrophone = () => {
    microphone.stop();
  };

  const stopMic = () => {
    microphone.stop();
    isCapturing = false;
    micError = null;
    waveLevels = createInitialVoiceWaveLevels();
    onRender();
  };

  const startMode = async (mode: VoiceDemoMode) => {
    onStarted(mode);
    try {
      await microphone.start();
      micError = null;
      isCapturing = true;
      onRender();
    } catch (error) {
      microphone.stop();
      isCapturing = false;
      waveLevels = createInitialVoiceWaveLevels();
      micError = formatErrorMessage(error);
      onRender();
    }
  };

  return {
    getIsCapturing: () => isCapturing,
    getMicError: () => micError,
    renderLiveLatency,
    renderWave,
    startMode,
    stopMic,
    stopMicrophone,
    syncAssistantOutput,
  };
};
