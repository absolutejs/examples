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
import type { VoiceStream, VoiceStreamState } from "@absolutejs/voice";
import {
  getVoiceSpeechEngineSampleRate,
  type SavedIntake,
  type VoiceSpeechEngine,
} from "../../../shared/demo";

type MicrophoneCaptureInput = {
  getActiveVoice: () => VoiceStream<SavedIntake> | null;
  getCurrentVoice: () => VoiceStreamState<SavedIntake>;
  speechEngine: VoiceSpeechEngine;
};

type MicrophoneCapture = {
  readonly error: string | null;
  readonly isCapturing: boolean;
  readonly liveLatencyHTML: string;
  startMic: () => Promise<void>;
  stopMic: () => void;
  syncAssistantOutput: () => void;
  readonly wavePath: string;
};

export const useMicrophoneCapture = (
  input: MicrophoneCaptureInput,
): MicrophoneCapture => {
  let isCapturing = $state(false);
  let error = $state<string | null>(null);
  let waveLevels = $state(createInitialVoiceWaveLevels());
  let liveLatencyHTML = $state("");
  let microphone: ReturnType<typeof createDemoMicrophone> | null = null;

  const bargeInEvidence = createDemoBargeInEvidence(() => {
    const activeVoice = input.getActiveVoice();
    const currentVoice = input.getCurrentVoice();

    return {
      assistantAudio: currentVoice.assistantAudio,
      assistantTexts: currentVoice.assistantTexts,
      sendAudio: (audio) => activeVoice?.sendAudio(audio),
      sessionId: currentVoice.sessionId,
    };
  });
  const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() => {
    const currentVoice = input.getCurrentVoice();

    return {
      assistantAudio: currentVoice.assistantAudio,
      assistantTexts: currentVoice.assistantTexts,
      sessionId: currentVoice.sessionId,
    };
  });
  liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
    liveLatencyEvidence.getSnapshot(),
  );
  const wavePath = $derived(createVoiceWavePath(waveLevels));

  const syncAssistantOutput = () => {
    bargeInEvidence.syncAssistantOutput();
    liveLatencyEvidence.syncAssistantOutput();
    liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
      liveLatencyEvidence.getSnapshot(),
    );
  };

  const startMic = async () => {
    try {
      microphone ??= createDemoMicrophone(
        (audio) => {
          liveLatencyEvidence.recordAudio(audio);
          liveLatencyHTML = renderDemoLiveTurnLatencyHTML(
            liveLatencyEvidence.getSnapshot(),
          );
          bargeInEvidence.sendAudio(audio);
        },
        (level) => {
          waveLevels = pushVoiceWaveLevel(waveLevels, level);
        },
        {
          sampleRateHz: getVoiceSpeechEngineSampleRate(input.speechEngine),
        },
      );
      await microphone.start();
      error = null;
      isCapturing = true;
    } catch (micError) {
      microphone?.stop();
      microphone = null;
      isCapturing = false;
      waveLevels = createInitialVoiceWaveLevels();
      error = formatErrorMessage(micError);
    }
  };

  const stopMic = () => {
    microphone?.stop();
    microphone = null;
    isCapturing = false;
    waveLevels = createInitialVoiceWaveLevels();
  };

  return {
    get error() {
      return error;
    },
    get isCapturing() {
      return isCapturing;
    },
    get liveLatencyHTML() {
      return liveLatencyHTML;
    },
    startMic,
    stopMic,
    syncAssistantOutput,
    get wavePath() {
      return wavePath;
    },
  };
};
