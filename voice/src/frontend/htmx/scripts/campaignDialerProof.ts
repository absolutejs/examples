type CampaignDialerProofPayload = {
  ok: boolean;
  providers: Array<{ provider: string }>;
};

type CampaignDialerProofWindow = typeof window & {
  runCampaignDialerProof?: (button: HTMLButtonElement) => Promise<void>;
};

export const registerCampaignDialerProof = () => {
  (window as CampaignDialerProofWindow).runCampaignDialerProof = async (
    button: HTMLButtonElement,
  ) => {
    const result = document.querySelector("#campaign-dialer-proof-result");
    button.disabled = true;
    if (result) {
      result.textContent = "Running campaign dialer proof...";
    }
    try {
      const response = await fetch("/api/voice/campaigns/dialer-proof", {
        method: "POST",
      });
      const payload: CampaignDialerProofPayload = await response.json();
      if (result) {
        result.textContent = payload.ok
          ? `Passed for ${payload.providers.map((item) => item.provider).join(", ")}.`
          : "Campaign dialer proof needs attention.";
      }
    } catch (error) {
      if (result) {
        result.textContent =
          error instanceof Error ? error.message : String(error);
      }
    } finally {
      button.disabled = false;
    }
  };
};
