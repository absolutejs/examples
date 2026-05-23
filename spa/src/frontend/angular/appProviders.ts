import type { EnvironmentProviders, Provider } from "@angular/core";

// Global Angular DI providers, threaded by the build into every page's
// compiled server output as `[...appProviders, provideRouter(routes, ...),
// { provide: APP_BASE_HREF, useValue: "/angular/" }]`. Referenced from
// `absolute.config.ts` via `angular: { providers: appProviders }` — this
// binding is what tells the build to auto-wire each page's `export const
// routes` into `provideRouter`. Empty here: the router + base href are
// inferred per page, and this demo needs no extra global providers.
export const appProviders: ReadonlyArray<Provider | EnvironmentProviders> = [];
