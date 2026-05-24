// Each framework is served under its own URL prefix (/react, /vue, ...). After
// an identity/connector link we send the user back to the framework they came
// from, derived from the OAuth origin URL.
export const KNOWN_FRAMEWORKS = [
  "react",
  "vue",
  "svelte",
  "angular",
  "html",
  "htmx",
];

// Toast notifications auto-dismiss after this many milliseconds.
export const TOAST_DURATION = 5000;
