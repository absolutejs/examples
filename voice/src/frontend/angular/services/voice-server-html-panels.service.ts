import { Injectable, signal } from "@angular/core";
import { createSyncSubscriber } from "@absolutejs/sync/client";
import {
  fetchBargeInReport,
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderDemoBargeInProofHTML,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../../shared/browser";
import {
  VOICE_SYNC_PATH,
  VOICE_WORKER_HEALTH_TOPIC,
} from "../../../constants/sync";

const REAL_CALL_WORKER_DESCRIPTION =
  "Angular renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";

@Injectable({ providedIn: "root" })
export class VoiceServerHtmlPanelsService {
  readonly bargeInProofHtml = signal(renderDemoBargeInProofHTML(null));
  readonly realCallWorkerHtml = signal(
    renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
      description: REAL_CALL_WORKER_DESCRIPTION,
    }),
  );
  private bargeInProofTimer: ReturnType<typeof setInterval> | null = null;
  private realCallWorkerSubscriber: ReturnType<
    typeof createSyncSubscriber
  > | null = null;

  async refreshBargeInProof() {
    try {
      this.bargeInProofHtml.set(
        renderDemoBargeInProofHTML(await fetchBargeInReport()),
      );
    } catch (error) {
      this.bargeInProofHtml.set(
        renderDemoBargeInProofHTML(null, formatErrorMessage(error)),
      );
    }
  }

  async refreshRealCallWorkerHealth() {
    try {
      this.realCallWorkerHtml.set(
        renderVoiceRealCallEvidenceWorkerHealthHTML(
          await fetchVoiceRealCallEvidenceWorkerHealth(),
          {
            description: REAL_CALL_WORKER_DESCRIPTION,
          },
        ),
      );
    } catch (error) {
      this.realCallWorkerHtml.set(
        renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
          description: REAL_CALL_WORKER_DESCRIPTION,
          error: formatErrorMessage(error),
        }),
      );
    }
  }

  start() {
    void this.refreshBargeInProof();
    this.bargeInProofTimer = setInterval(() => {
      void this.refreshBargeInProof();
    }, 3_000);
    // Reactive instead of polled: the worker loop republishes worker-health on
    // every collect tick over @absolutejs/sync's SSE stream, so refetch on event
    // instead of a 10s timer.
    void this.refreshRealCallWorkerHealth();
    this.realCallWorkerSubscriber = createSyncSubscriber({
      onEvent: () => {
        void this.refreshRealCallWorkerHealth();
      },
      topics: [VOICE_WORKER_HEALTH_TOPIC],
      url: VOICE_SYNC_PATH,
    });
  }

  stop() {
    if (this.bargeInProofTimer) {
      clearInterval(this.bargeInProofTimer);
    }
    this.realCallWorkerSubscriber?.close();
    this.realCallWorkerSubscriber = null;
  }
}
