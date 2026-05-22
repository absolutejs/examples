import { type ComputedRef, computed, type Ref, ref, watchEffect } from "vue";
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
  type VoiceSpeechEngine,
} from "../../../shared/demo";
import type { VueVoiceStream } from "./useVoiceDemoStreams";

type MicrophoneCaptureInput = {
  currentVoice: ComputedRef<VueVoiceStream>;
  micError: Ref<string | null>;
  speechEngine: Ref<VoiceSpeechEngine>;
};

type MicrophoneCapture = {
  isCapturing: Ref<boolean>;
  liveLatencyHTML: Ref<string>;
  startMic: () => Promise<void>;
  stopMic: () => void;
  wavePath: ComputedRef<string>;
};

export const useMicrophoneCapture = (
  input: MicrophoneCaptureInput,
): MicrophoneCapture => {
  const isCapturing = ref(false);
  const waveLevels = ref(createInitialVoiceWaveLevels());
  const liveLatencyHTML = ref("");
  let microphone: ReturnType<typeof createDemoMicrophone> | null = null;

  const bargeInEvidence = createDemoBargeInEvidence(() => {
    const voice = input.currentVoice.value;

    return {
      assistantAudio: voice.assistantAudio.value,
      assistantTexts: voice.assistantTexts.value,
      sendAudio: voice.sendAudio,
      sessionId: voice.sessionId.value,
    };
  });
  const liveLatencyEvidence = createDemoLiveTurnLatencyEvidence(() => {
    const voice = input.currentVoice.value;

    return {
      assistantAudio: voice.assistantAudio.value,
      assistantTexts: voice.assistantTexts.value,
      sessionId: voice.sessionId.value,
    };
  });

  liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
    liveLatencyEvidence.getSnapshot(),
  );

  const wavePath = computed(() => createVoiceWavePath(waveLevels.value));

  watchEffect(() => {
    input.currentVoice.value.assistantAudio.value.length;
    input.currentVoice.value.assistantTexts.value.length;
    input.currentVoice.value.sessionId.value;
    bargeInEvidence.syncAssistantOutput();
    liveLatencyEvidence.syncAssistantOutput();
    liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
      liveLatencyEvidence.getSnapshot(),
    );
  });

  const startMic = async () => {
    try {
      microphone ??= createDemoMicrophone(
        (audio) => {
          liveLatencyEvidence.recordAudio(audio);
          liveLatencyHTML.value = renderDemoLiveTurnLatencyHTML(
            liveLatencyEvidence.getSnapshot(),
          );
          bargeInEvidence.sendAudio(audio);
        },
        (level) => {
          waveLevels.value = pushVoiceWaveLevel(waveLevels.value, level);
        },
        {
          sampleRateHz: getVoiceSpeechEngineSampleRate(input.speechEngine.value),
        },
      );
      await microphone.start();
      input.micError.value = null;
      isCapturing.value = true;
    } catch (error) {
      microphone?.stop();
      microphone = null;
      isCapturing.value = false;
      waveLevels.value = createInitialVoiceWaveLevels();
      input.micError.value = formatErrorMessage(error);
    }
  };

  const stopMic = () => {
    microphone?.stop();
    microphone = null;
    isCapturing.value = false;
    waveLevels.value = createInitialVoiceWaveLevels();
  };

  return {
    isCapturing,
    liveLatencyHTML,
    startMic,
    stopMic,
    wavePath,
  };
};
