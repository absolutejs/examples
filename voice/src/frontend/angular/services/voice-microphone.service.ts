import { Injectable, computed, signal } from "@angular/core";
import {
  createDemoMicrophone,
  createInitialVoiceWaveLevels,
  createVoiceWavePath,
  formatErrorMessage,
  pushVoiceWaveLevel,
} from "../../shared/browser";

type StartMicrophoneOptions = {
  onAudio: (audio: Uint8Array | ArrayBuffer) => void;
  sampleRateHz: number;
};

@Injectable({ providedIn: "root" })
export class VoiceMicrophoneService {
  readonly isCapturing = signal(false);
  readonly micError = signal<string | null>(null);
  readonly waveLevels = signal(createInitialVoiceWaveLevels());
  readonly wavePath = computed(() => createVoiceWavePath(this.waveLevels()));
  private microphone: ReturnType<typeof createDemoMicrophone> | null = null;

  async start(options: StartMicrophoneOptions) {
    try {
      this.microphone ??= createDemoMicrophone(
        (audio) => {
          options.onAudio(audio);
        },
        (level) => {
          this.waveLevels.update((current) =>
            pushVoiceWaveLevel(current, level),
          );
        },
        {
          sampleRateHz: options.sampleRateHz,
        },
      );
      await this.microphone.start();
      this.micError.set(null);
      this.isCapturing.set(true);
    } catch (error) {
      this.microphone?.stop();
      this.microphone = null;
      this.isCapturing.set(false);
      this.waveLevels.set(createInitialVoiceWaveLevels());
      this.micError.set(formatErrorMessage(error));
    }
  }

  stop() {
    this.microphone?.stop();
    this.microphone = null;
    this.isCapturing.set(false);
    this.waveLevels.set(createInitialVoiceWaveLevels());
  }
}
