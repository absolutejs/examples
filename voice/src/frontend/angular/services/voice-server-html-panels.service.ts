import { Injectable, signal } from "@angular/core";
import {
  fetchBargeInReport,
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderDemoBargeInProofHTML,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../../shared/browser";

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
  private realCallWorkerTimer: ReturnType<typeof setInterval> | null = null;

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
    void this.refreshRealCallWorkerHealth();
    this.realCallWorkerTimer = setInterval(() => {
      void this.refreshRealCallWorkerHealth();
    }, 10_000);
  }

  stop() {
    if (this.bargeInProofTimer) {
      clearInterval(this.bargeInProofTimer);
    }
    if (this.realCallWorkerTimer) {
      clearInterval(this.realCallWorkerTimer);
    }
  }
}
