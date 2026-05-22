import { VOICE_CALL_CONTROL_ACTIONS } from "../../../shared/demo";
import { escapeHtml } from "./format";
import type { VoiceDemoElements } from "./dom";
import type { VoiceDemoStream } from "./streams";

type CallControlsInput = {
  currentVoice: () => VoiceDemoStream;
  elements: VoiceDemoElements;
  stopMic: () => void;
};

export const wireCallControls = (input: CallControlsInput) => {
  const { currentVoice, elements, stopMic } = input;
  elements.callControlRoot.innerHTML = VOICE_CALL_CONTROL_ACTIONS.map(
    (action) =>
      `<button data-call-action="${escapeHtml(action.action)}" type="button">${escapeHtml(action.label)}</button>`,
  ).join("");

  elements.callControlRoot.addEventListener("click", (event) => {
    const button = event.target;
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const action = VOICE_CALL_CONTROL_ACTIONS.find(
      (item) => item.action === button.dataset.callAction,
    );
    if (!action) {
      return;
    }

    currentVoice().callControl(action);
    stopMic();
  });
};
