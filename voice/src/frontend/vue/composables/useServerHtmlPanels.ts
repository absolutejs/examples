import {
  type ComputedRef,
  computed,
  onMounted,
  onUnmounted,
  type Ref,
  ref,
} from "vue";
import {
  createVoiceProfileSwitchRecommendationStore,
  renderVoiceProfileSwitchRecommendationHTML,
} from "@absolutejs/voice/client";
import {
  fetchVoiceRealCallEvidenceWorkerHealth,
  formatErrorMessage,
  renderVoiceRealCallEvidenceWorkerHealthHTML,
} from "../../shared/browser";

const PROFILE_SWITCH_INTERVAL_MS = 10_000;
const REAL_CALL_WORKER_INTERVAL_MS = 10_000;
const REAL_CALL_WORKER_DESCRIPTION =
  "Vue renders whether rolling real-call evidence is automatic or manual, backed by the same worker health route used by readiness.";
const PROFILE_SWITCH_WIDGET_OPTIONS = {
  description:
    "Vue compares latest session signals against measured profile evidence and recommends whether to switch stacks.",
  title: "Profile Switch Recommendation",
};
const DEFAULT_CAMPAIGN_DIALER_PROVIDERS = ["twilio", "telnyx", "plivo"];

type CampaignDialerProofSnapshot = {
  error: string | null;
  isLoading: boolean;
  report?: {
    providers: Array<{
      carrierRequests: unknown[];
      outcomes: Array<{ applied: boolean }>;
      provider: string;
    }>;
  };
  status?: {
    providers: string[];
  };
};

type ServerHtmlPanels = {
  campaignDialerProof: Ref<CampaignDialerProofSnapshot>;
  campaignDialerProofReadyProviders: ComputedRef<string>;
  profileSwitchHTML: Ref<string>;
  realCallWorkerHTML: Ref<string>;
  runCampaignDialerProof: () => Promise<void>;
};

export const useServerHtmlPanels = (): ServerHtmlPanels => {
  const profileSwitchRecommendation =
    createVoiceProfileSwitchRecommendationStore(
      "/api/voice/profile-switch-recommendation",
      {
        intervalMs: PROFILE_SWITCH_INTERVAL_MS,
      },
    );
  const profileSwitchHTML = ref(
    renderVoiceProfileSwitchRecommendationHTML(
      profileSwitchRecommendation.getSnapshot(),
      PROFILE_SWITCH_WIDGET_OPTIONS,
    ),
  );
  const realCallWorkerHTML = ref(
    renderVoiceRealCallEvidenceWorkerHealthHTML(null, {
      description: REAL_CALL_WORKER_DESCRIPTION,
    }),
  );
  const campaignDialerProof = ref<CampaignDialerProofSnapshot>({
    error: null,
    isLoading: false,
  });
  const campaignDialerProofReadyProviders = computed(() =>
    (
      campaignDialerProof.value.status?.providers ??
      DEFAULT_CAMPAIGN_DIALER_PROVIDERS
    ).join(", "),
  );

  let realCallWorkerTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribeProfileSwitch = () => {};

  const refreshRealCallWorkerHealth = async () => {
    try {
      realCallWorkerHTML.value = renderVoiceRealCallEvidenceWorkerHealthHTML(
        await fetchVoiceRealCallEvidenceWorkerHealth(),
        { description: REAL_CALL_WORKER_DESCRIPTION },
      );
    } catch (error) {
      realCallWorkerHTML.value = renderVoiceRealCallEvidenceWorkerHealthHTML(
        null,
        {
          description: REAL_CALL_WORKER_DESCRIPTION,
          error: formatErrorMessage(error),
        },
      );
    }
  };

  const refreshCampaignDialerProof = async () => {
    const response = await fetch("/api/voice/campaigns/dialer-proof");
    if (!response.ok) {
      throw new Error(`Campaign dialer proof status failed: ${response.status}`);
    }
    campaignDialerProof.value = {
      ...campaignDialerProof.value,
      error: null,
      status: await response.json(),
    };
  };

  const runCampaignDialerProof = async () => {
    campaignDialerProof.value = {
      ...campaignDialerProof.value,
      error: null,
      isLoading: true,
    };
    try {
      const response = await fetch("/api/voice/campaigns/dialer-proof", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(`Campaign dialer proof failed: ${response.status}`);
      }
      campaignDialerProof.value = {
        ...campaignDialerProof.value,
        error: null,
        isLoading: false,
        report: await response.json(),
      };
    } catch (error) {
      campaignDialerProof.value = {
        ...campaignDialerProof.value,
        error: formatErrorMessage(error),
        isLoading: false,
      };
    }
  };

  onMounted(() => {
    unsubscribeProfileSwitch = profileSwitchRecommendation.subscribe(() => {
      profileSwitchHTML.value = renderVoiceProfileSwitchRecommendationHTML(
        profileSwitchRecommendation.getSnapshot(),
        PROFILE_SWITCH_WIDGET_OPTIONS,
      );
    });
    void profileSwitchRecommendation.refresh().catch(() => {});
    void refreshRealCallWorkerHealth();
    void refreshCampaignDialerProof().catch((error) => {
      campaignDialerProof.value = {
        ...campaignDialerProof.value,
        error: formatErrorMessage(error),
      };
    });
    realCallWorkerTimer = setInterval(() => {
      void refreshRealCallWorkerHealth();
    }, REAL_CALL_WORKER_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (realCallWorkerTimer) {
      clearInterval(realCallWorkerTimer);
    }
    unsubscribeProfileSwitch();
    profileSwitchRecommendation.close();
  });

  return {
    campaignDialerProof,
    campaignDialerProofReadyProviders,
    profileSwitchHTML,
    realCallWorkerHTML,
    runCampaignDialerProof,
  };
};
