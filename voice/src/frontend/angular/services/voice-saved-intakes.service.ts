import { Injectable, signal } from "@angular/core";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
} from "../../../shared/browser";
import { VOICE_INTAKES_TOPIC, VOICE_SYNC_PATH } from "../../../constants/sync";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
} from "../../../types/domain";

@Injectable({ providedIn: "root" })
export class VoiceSavedIntakesService {
  readonly agentSquadStatus = signal<VoiceAgentSquadDemoStatus | null>(null);
  readonly savedIntakes = signal<SavedIntake[]>([]);
  private subscriber: ReturnType<typeof createSyncSubscriber> | null = null;

  async refreshAgentSquadStatus(sessionId: string | undefined) {
    this.agentSquadStatus.set(await fetchAgentSquadDemoStatus(sessionId));
  }

  async refreshIntakes() {
    this.savedIntakes.set(await fetchSavedIntakes());
  }

  // Reactive instead of polled: load once, then refetch only when the server
  // pushes a "voice:intakes" change over @absolutejs/sync's SSE stream. No timer.
  start(getSessionId: () => string | undefined) {
    void this.refreshIntakes();
    void this.refreshAgentSquadStatus(getSessionId());
    this.subscriber = createSyncSubscriber({
      onEvent: () => {
        void this.refreshIntakes();
        void this.refreshAgentSquadStatus(getSessionId());
      },
      topics: [VOICE_INTAKES_TOPIC],
      url: VOICE_SYNC_PATH,
    });
  }

  stop() {
    this.subscriber?.close();
    this.subscriber = null;
  }
}
