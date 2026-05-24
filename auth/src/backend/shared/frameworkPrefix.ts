import { KNOWN_FRAMEWORKS } from "../../constants";

// Map an OAuth origin URL back to the framework prefix the user came from
// (/react, /vue, ...) so post-link redirects return them to the right app.
// Falls back to /react when the origin doesn't carry a known framework prefix.
export const frameworkPrefixFromOrigin = (originUrl: string) => {
  const path = originUrl.startsWith("http")
    ? new URL(originUrl).pathname
    : originUrl;
  const [segment] = path.split("/").filter(Boolean);

  return segment !== undefined && KNOWN_FRAMEWORKS.includes(segment)
    ? `/${segment}`
    : "/react";
};
