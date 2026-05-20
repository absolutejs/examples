<script lang="ts">
  type RegistrationCardProps = {
    onRegistered: (reg: ServiceWorkerRegistration | null) => void;
  };

  let { onRegistered }: RegistrationCardProps = $props();

  type SwState = "unsupported" | "unregistered" | "registering" | "active";
  let swState = $state<SwState>("unregistered");
  let scope = $state<string | null>(null);
  let scriptUrl = $state<string | null>(null);

  $effect(() => {
    if (!("serviceWorker" in navigator)) {
      swState = "unsupported";
      return;
    }
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg?.active) {
        swState = "active";
        scope = reg.scope;
        scriptUrl = reg.active.scriptURL;
        onRegistered(reg);
      }
    });
  });

  function register() {
    if (!("serviceWorker" in navigator)) return;
    swState = "registering";
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        const sw = reg.active || reg.installing || reg.waiting;
        if (sw) {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") {
              swState = "active";
              scope = reg.scope;
              scriptUrl = sw.scriptURL;
              onRegistered(reg);
            }
          });
          if (sw.state === "activated") {
            swState = "active";
            scope = reg.scope;
            scriptUrl = sw.scriptURL;
            onRegistered(reg);
          }
        }
      })
      .catch(() => {
        swState = "unregistered";
      });
  }

  function unregister() {
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        reg.unregister().then(() => {
          swState = "unregistered";
          scope = null;
          scriptUrl = null;
          onRegistered(null);
        });
      }
    });
  }

  let badgeClass = $derived(
    swState === "active"
      ? "active"
      : swState === "registering"
        ? "pending"
        : "inactive",
  );
  let badgeLabel = $derived(
    swState === "unsupported"
      ? "Not Supported"
      : swState === "active"
        ? "Active"
        : swState === "registering"
          ? "Registering"
          : "Unregistered",
  );
</script>

<div class="sw-card">
  <div class="card-title">Registration</div>
  <p class="card-desc">Register and unregister the service worker.</p>
  <div class="status-badge {badgeClass}">
    <span class="dot"></span>
    {badgeLabel}
  </div>
  <div class="btn-row">
    <button
      disabled={swState === "active" || swState === "unsupported"}
      onclick={register}
    >
      Register
    </button>
    <button class="danger" disabled={swState !== "active"} onclick={unregister}>
      Unregister
    </button>
  </div>
  <div class="sw-result">
    <div class="result-row">
      <span>Scope</span><span>{scope ?? "\u2014"}</span>
    </div>
    <div class="result-row">
      <span>Script</span><span
        >{scriptUrl ? scriptUrl.split("/").pop() : "\u2014"}</span
      >
    </div>
  </div>
</div>
