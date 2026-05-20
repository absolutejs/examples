import { HEX_RADIX } from "../constants";

self.onmessage = async (event: MessageEvent<{ text: string }>) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(event.data.text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(HEX_RADIX).padStart(2, "0"))
    .join("");
  self.postMessage({ hash: hashHex, input: event.data.text });
};
