import { Injectable, computed, signal } from "@angular/core";
import {
  formatErrorMessage,
  postVoiceLiveOpsAction,
  renderVoiceLiveOpsResultHTML,
  type VoiceLiveOpsAction,
  type VoiceLiveOpsActionResult,
} from "../../shared/browser";

type LiveOpsActionContext = {
  applySideEffects: (input: {
    action: VoiceLiveOpsAction;
    detail: string;
    tag: string;
  }) => void;
  sessionId: string | null;
};

@Injectable({ providedIn: "root" })
export class VoiceLiveOpsService {
  readonly liveOpsAssignee = signal("demo-operator");
  readonly liveOpsDetail = signal("Operator marked this live session.");
  readonly liveOpsError = signal<string | null>(null);
  readonly liveOpsResult = signal<VoiceLiveOpsActionResult | null>(null);
  readonly liveOpsRunning = signal(false);
  readonly liveOpsTag = signal("needs-review");
  readonly liveOpsResultHtml = computed(() =>
    renderVoiceLiveOpsResultHTML(this.liveOpsResult(), this.liveOpsError()),
  );

  setLiveOpsAssignee(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      this.liveOpsAssignee.set(event.target.value);
    }
  }

  setLiveOpsDetail(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      this.liveOpsDetail.set(event.target.value);
    }
  }

  setLiveOpsTag(event: Event) {
    if (event.target instanceof HTMLInputElement) {
      this.liveOpsTag.set(event.target.value);
    }
  }

  async runLiveOpsAction(
    action: VoiceLiveOpsAction,
    context: LiveOpsActionContext,
  ) {
    this.liveOpsRunning.set(true);
    this.liveOpsError.set(null);
    try {
      const detail = this.liveOpsDetail();
      const tag = this.liveOpsTag();
      const result = await postVoiceLiveOpsAction({
        action,
        assignee: this.liveOpsAssignee(),
        detail,
        sessionId: context.sessionId,
        tag,
      });
      this.liveOpsResult.set(result);
      context.applySideEffects({ action, detail, tag });
    } catch (error) {
      this.liveOpsError.set(formatErrorMessage(error));
    } finally {
      this.liveOpsRunning.set(false);
    }
  }
}
