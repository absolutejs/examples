import {
  createIslandManifestResolver,
  startIslands,
} from "@absolutejs/absolute/client";
import { defineIslandRegistry } from "@absolutejs/absolute/islands";

declare global {
  interface Window {
    __ABSOLUTE_MANIFEST__?: Record<string, string>;
  }
}

const emptyRegistry = defineIslandRegistry({});

const loadRuntimeRegistry = async () => {
  const manifest = window.__ABSOLUTE_MANIFEST__;
  if (manifest && Object.keys(manifest).length > 0) {
    return {
      registry: emptyRegistry,
      resolveComponent: createIslandManifestResolver(manifest),
    };
  }

  const [{ islandRegistry }] = await Promise.all([
    import("../islands/registry"),
  ]);

  return {
    registry: islandRegistry,
  };
};

const boot = async () => {
  const runtime = await loadRuntimeRegistry();
  startIslands(runtime);
};

const queueBoot = (delay: number) => {
  window.setTimeout(() => {
    void boot();
  }, delay);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => void boot(), {
    once: true,
  });
} else {
  void boot();
}

window.addEventListener("load", () => void boot(), { once: true });
queueBoot(0);
queueBoot(50);
queueBoot(200);
