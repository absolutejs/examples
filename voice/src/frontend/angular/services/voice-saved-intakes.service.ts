import { Injectable, signal } from "@angular/core";
import {
  fetchAgentSquadDemoStatus,
  fetchSavedIntakes,
} from "../../../shared/browser";
import type {
  SavedIntake,
  VoiceAgentSquadDemoStatus,
} from "../../../types/domain";

@Injectable({ providedIn: "root" })
export class VoiceSavedIntakesService {
  readonly agentSquadStatus = signal<VoiceAgentSquadDemoStatus | null>(null);
  readonly savedIntakes = signal<SavedIntake[]>([]);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  async refreshAgentSquadStatus(sessionId: string | undefined) {
    this.agentSquadStatus.set(await fetchAgentSquadDemoStatus(sessionId));
  }

  async refreshIntakes() {
    this.savedIntakes.set(await fetchSavedIntakes());
  }

  start(getSessionId: () => string | undefined) {
    void this.refreshIntakes();
    this.refreshTimer = setInterval(() => {
      void this.refreshIntakes();
      void this.refreshAgentSquadStatus(getSessionId());
    }, 4_000);
    void this.refreshAgentSquadStatus(getSessionId());
  }

  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}
