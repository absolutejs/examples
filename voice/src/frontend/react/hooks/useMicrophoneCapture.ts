import { useEffect, useRef, useState } from "react";
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
import {
  EMPTY_VOICE,
  type ReactVoiceDemoStream,
} from "./useVoiceDemoStreams";

type MicrophoneCaptureInput = {
  activeModeRef: { current: VoiceDemoMode | null };
  currentVoice: ReactVoiceDemoStream;
  speechEngine: VoiceSpeechEngine;
  voicesRef: {
    current: { general: ReactVoiceDemoStream; guided: ReactVoiceDemoStream };
  };
};

export const useMicrophoneCapture = (input: MicrophoneCaptureInput) => {
  const microphoneRef = useRef<ReturnType<typeof createDemoMicrophone> | null>(
    null,
  );
  const bargeInRef = useRef<ReturnType<
    typeof createDemoBargeInEvidence
  > | null>(null);
  const liveLatencyRef = useRef<ReturnType<
    typeof createDemoLiveTurnLatencyEvidence
  > | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [waveLevels, setWaveLevels] = useState(createInitialVoiceWaveLevels);
  const [liveLatencyHTML, setLiveLatencyHTML] = useState(() =>
    renderDemoLiveTurnLatencyHTML(
      createDemoLiveTurnLatencyEvidence(() => EMPTY_VOICE).getSnapshot(),
    ),
  );
  const { activeModeRef, currentVoice, speechEngine, voicesRef } = input;

  useEffect(() => {
    bargeInRef.current?.syncAssistantOutput();
    liveLatencyRef.current?.syncAssistantOutput();
    if (liveLatencyRef.current) {
      setLiveLatencyHTML(
        renderDemoLiveTurnLatencyHTML(liveLatencyRef.current.getSnapshot()),
      );
    }
  }, [
    currentVoice.assistantAudio.length,
    currentVoice.assistantTexts.length,
    currentVoice.sessionId,
  ]);

  useEffect(
    () => () => {
      microphoneRef.current?.stop();
    },
    [],
  );

  const startMic = async () => {
    try {
      const microphone =
        microphoneRef.current ??
        createDemoMicrophone(
          (audio) => {
            bargeInRef.current ??= createDemoBargeInEvidence(() =>
              activeModeRef.current === "general"
                ? voicesRef.current.general
                : voicesRef.current.guided,
            );
            liveLatencyRef.current ??= createDemoLiveTurnLatencyEvidence(() =>
              activeModeRef.current === "general"
                ? voicesRef.current.general
                : voicesRef.current.guided,
            );
            liveLatencyRef.current.recordAudio(audio);
            setLiveLatencyHTML(
              renderDemoLiveTurnLatencyHTML(
                liveLatencyRef.current.getSnapshot(),
              ),
            );
            bargeInRef.current.sendAudio(audio);
          },
          (level) => {
            setWaveLevels((current) => pushVoiceWaveLevel(current, level));
          },
          {
            sampleRateHz: getVoiceSpeechEngineSampleRate(speechEngine),
          },
        );
      microphoneRef.current = microphone;
      await microphone.start();
      setMicError(null);
      setIsCapturing(true);
    } catch (error) {
      microphoneRef.current?.stop();
      microphoneRef.current = null;
      setIsCapturing(false);
      setWaveLevels(createInitialVoiceWaveLevels());
      setMicError(formatErrorMessage(error));
    }
  };

  const stopMic = () => {
    microphoneRef.current?.stop();
    microphoneRef.current = null;
    setIsCapturing(false);
    setWaveLevels(createInitialVoiceWaveLevels());
  };

  const voiceWavePath = createVoiceWavePath(waveLevels);

  return {
    isCapturing,
    liveLatencyHTML,
    micError,
    startMic,
    stopMic,
    voiceWavePath,
  };
};
