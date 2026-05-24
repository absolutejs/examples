import { type ComputedRef, computed, type Ref } from "vue";
import {
  useVoiceProfileComparison,
  useVoiceStream,
  useVoiceTraceTimeline,
} from "@absolutejs/voice/vue";
import {
  createVoiceProfileComparisonViewModel,
  createVoiceTraceTimelineViewModel,
} from "@absolutejs/voice/client";
import { voiceReactiveSource } from "../../../shared/browser";
import {
  VOICE_EVIDENCE_TOPIC,
  VOICE_TURN_TOPIC,
} from "../../../constants/sync";
import {
  getVoiceLeadMessage,
  getVoiceModePrompt,
  getVoiceProfileSwitchGuardDecision,
  getVoiceRoutePath,
} from "../../../shared/demo";
import type { SavedIntake } from "../../../types/domain";
import type {
  VoiceDemoMode,
  VoiceModelProvider,
  VoiceProfileId,
  VoiceRoutingMode,
  VoiceSpeechEngine,
} from "../../../types/voice";

const RECONNECT_REPORT_PATH = "/api/voice/reconnect-traces";
const TRACE_TIMELINE_LIMIT = 2;

export type VueVoiceStream = ReturnType<typeof useVoiceStream<SavedIntake>>;

type VoiceDemoStreamsInput = {
  activeMode: Ref<VoiceDemoMode | null>;
  hasStartedModes: Ref<Record<VoiceDemoMode, boolean>>;
  micError: Ref<string | null>;
  modelProvider: Ref<VoiceModelProvider>;
  profileId: Ref<VoiceProfileId>;
  routingMode: Ref<VoiceRoutingMode>;
  speechEngine: Ref<VoiceSpeechEngine>;
};

type VoiceDemoStreams = {
  callLifecycleLabel: ComputedRef<string>;
  currentPrompt: ComputedRef<string>;
  currentVoice: ComputedRef<VueVoiceStream>;
  errorMessage: ComputedRef<string>;
  generalVoice: VueVoiceStream;
  guidedVoice: VueVoiceStream;
  leadMessage: ComputedRef<string>;
  profileComparisonModel: ComputedRef<
    ReturnType<typeof createVoiceProfileComparisonViewModel>
  >;
  profileSwitchGuardDecision: ComputedRef<
    ReturnType<typeof getVoiceProfileSwitchGuardDecision>
  >;
  traceTimelineModel: ComputedRef<
    ReturnType<typeof createVoiceTraceTimelineViewModel>
  >;
};

export const useVoiceDemoStreams = (
  input: VoiceDemoStreamsInput,
): VoiceDemoStreams => {
  const guidedVoice = useVoiceStream<SavedIntake>(
    getVoiceRoutePath(
      "guided",
      input.modelProvider.value,
      input.routingMode.value,
      input.speechEngine.value,
      input.profileId.value,
    ),
    { reconnectReportPath: RECONNECT_REPORT_PATH },
  );
  const generalVoice = useVoiceStream<SavedIntake>(
    getVoiceRoutePath(
      "general",
      input.modelProvider.value,
      input.routingMode.value,
      input.speechEngine.value,
      input.profileId.value,
    ),
    { reconnectReportPath: RECONNECT_REPORT_PATH },
  );
  const traceTimeline = useVoiceTraceTimeline("/api/voice-traces", {
    reactiveSource: voiceReactiveSource(VOICE_TURN_TOPIC),
  });
  const profileComparison = useVoiceProfileComparison(
    "/api/voice/real-call-profile-history",
    {
      reactiveSource: voiceReactiveSource(VOICE_EVIDENCE_TOPIC),
    },
  );
  const profileComparisonModel = computed(() =>
    createVoiceProfileComparisonViewModel(
      {
        error: profileComparison.error.value,
        isLoading: profileComparison.isLoading.value,
        report: profileComparison.report.value,
        updatedAt: profileComparison.updatedAt.value,
      },
      {
        description:
          "Vue renders measured profile defaults and persisted reconnect resume evidence behind each selected stack.",
        title: "Profile + Reconnect Evidence",
      },
    ),
  );
  const currentVoice = computed(() =>
    input.activeMode.value === "general" ? generalVoice : guidedVoice,
  );
  const errorMessage = computed(
    () => input.micError.value || currentVoice.value.error.value || "None",
  );
  const profileSwitchGuardDecision = computed(() =>
    getVoiceProfileSwitchGuardDecision(
      currentVoice.value.sessionMetadata.value,
    ),
  );
  const currentPrompt = computed(() =>
    getVoiceModePrompt({
      hasStarted:
        (input.activeMode.value
          ? input.hasStartedModes.value[input.activeMode.value]
          : false) || currentVoice.value.turns.value.length > 0,
      mode: input.activeMode.value,
      status: currentVoice.value.status.value,
      turnCount: currentVoice.value.turns.value.length,
    }),
  );
  const leadMessage = computed(() =>
    getVoiceLeadMessage({
      hasStarted:
        (input.activeMode.value
          ? input.hasStartedModes.value[input.activeMode.value]
          : false) || currentVoice.value.turns.value.length > 0,
      mode: input.activeMode.value,
      status: currentVoice.value.status.value,
      turnCount: currentVoice.value.turns.value.length,
    }),
  );
  const callLifecycleLabel = computed(() => {
    const call = currentVoice.value.call.value;

    return call?.disposition
      ? `${call.disposition} after ${call.events.length} lifecycle event${call.events.length === 1 ? "" : "s"}`
      : (call?.events.at(-1)?.type ?? "Not started");
  });
  const traceTimelineModel = computed(() =>
    createVoiceTraceTimelineViewModel(
      {
        error: traceTimeline.error.value,
        isLoading: traceTimeline.isLoading.value,
        report: traceTimeline.report.value,
        updatedAt: traceTimeline.updatedAt.value,
      },
      {
        incidentBundleBasePath: "/voice-incidents",
        limit: TRACE_TIMELINE_LIMIT,
        operationsRecordBasePath: "/voice-operations",
      },
    ),
  );

  return {
    callLifecycleLabel,
    currentPrompt,
    currentVoice,
    errorMessage,
    generalVoice,
    guidedVoice,
    leadMessage,
    profileComparisonModel,
    profileSwitchGuardDecision,
    traceTimelineModel,
  };
};
