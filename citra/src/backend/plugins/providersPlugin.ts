import { Elysia, type AnyElysia } from 'elysia';

// Every provider module (providers/*.ts) throws at import time if its OAuth2 credentials are
// absent from the environment. Load them lazily and skip any that aren't configured, so the
// showcase boots with whatever providers you've set up in .env — or none — instead of
// crashing on the first unconfigured provider.
const providerLoaders: Record<string, () => Promise<AnyElysia>> = {
	'42': async () => (await import('../providers/42')).fortyTwoPlugin,
	'amazon-cognito': async () =>
		(await import('../providers/amazon-cognito')).amazonCognitoPlugin,
	anilist: async () => (await import('../providers/anilist')).anilistPlugin,
	apple: async () => (await import('../providers/apple')).applePlugin,
	atlassian: async () =>
		(await import('../providers/atlassian')).atlassianPlugin,
	auth0: async () => (await import('../providers/auth0')).auth0Plugin,
	authentik: async () =>
		(await import('../providers/authentik')).authentikPlugin,
	autodesk: async () =>
		(await import('../providers/autodesk')).autodeskPlugin,
	battlenet: async () =>
		(await import('../providers/battlenet')).battlenetPlugin,
	bitbucket: async () =>
		(await import('../providers/bitbucket')).bitbucketPlugin,
	box: async () => (await import('../providers/box')).boxPlugin,
	bungie: async () => (await import('../providers/bungie')).bungiePlugin,
	coinbase: async () =>
		(await import('../providers/coinbase')).coinbasePlugin,
	discord: async () => (await import('../providers/discord')).discordPlugin,
	'donation-alerts': async () =>
		(await import('../providers/donation-alerts')).donationAlertsPlugin,
	dribble: async () => (await import('../providers/dribble')).dribbblePlugin,
	dropbox: async () => (await import('../providers/dropbox')).dropboxPlugin,
	'epic-games': async () =>
		(await import('../providers/epic-games')).epicGamesPlugin,
	etsy: async () => (await import('../providers/etsy')).etsyPlugin,
	facebook: async () =>
		(await import('../providers/facebook')).facebookPlugin,
	figma: async () => (await import('../providers/figma')).figmaPlugin,
	gitea: async () => (await import('../providers/gitea')).giteaPlugin,
	github: async () => (await import('../providers/github')).githubPlugin,
	gitlab: async () => (await import('../providers/gitlab')).gitlabPlugin,
	google: async () => (await import('../providers/google')).googlePlugin,
	intuit: async () => (await import('../providers/intuit')).intuitPlugin,
	kakao: async () => (await import('../providers/kakao')).kakaoPlugin,
	keycloak: async () =>
		(await import('../providers/keycloak')).keycloakPlugin,
	kick: async () => (await import('../providers/kick')).kickPlugin,
	lichess: async () => (await import('../providers/lichess')).lichessPlugin,
	line: async () => (await import('../providers/line')).linePlugin,
	linear: async () => (await import('../providers/linear')).linearPlugin,
	linkedin: async () =>
		(await import('../providers/linkedin')).linkedinPlugin,
	mastodon: async () =>
		(await import('../providers/mastodon')).mastodonPlugin,
	'mercado-libre': async () =>
		(await import('../providers/mercado-libre')).mercadoLibrePlugin,
	'mercado-pago': async () =>
		(await import('../providers/mercado-pago')).mercadoPagoPlugin,
	'microsoft-entra-id': async () =>
		(await import('../providers/microsoft-entra-id'))
			.microsoftEntraIDPlugin,
	myanimelist: async () =>
		(await import('../providers/myanimelist')).myAnimeListPlugin,
	naver: async () => (await import('../providers/naver')).naverPlugin,
	notion: async () => (await import('../providers/notion')).notionPlugin,
	okta: async () => (await import('../providers/okta')).oktaPlugin,
	osu: async () => (await import('../providers/osu')).osuPlugin,
	patreon: async () => (await import('../providers/patreon')).patreonPlugin,
	polar: async () => (await import('../providers/polar')).polarPlugin,
	'polar-accesslink': async () =>
		(await import('../providers/polar-accesslink')).polarAccessLinkPlugin,
	'polar-team-pro': async () =>
		(await import('../providers/polar-team-pro')).polarTeamProPlugin,
	reddit: async () => (await import('../providers/reddit')).redditPlugin,
	roblox: async () => (await import('../providers/roblox')).robloxPlugin,
	salesforce: async () =>
		(await import('../providers/salesforce')).salesforcePlugin,
	shikimori: async () =>
		(await import('../providers/shikimori')).shikimoriPlugin,
	slack: async () => (await import('../providers/slack')).slackPlugin,
	spotify: async () => (await import('../providers/spotify')).spotifyPlugin,
	'start.gg': async () =>
		(await import('../providers/start.gg')).startggPlugin,
	strava: async () => (await import('../providers/strava')).stravaPlugin,
	synology: async () =>
		(await import('../providers/synology')).synologyPlugin,
	tiktok: async () => (await import('../providers/tiktok')).tiktokPlugin,
	tiltify: async () => (await import('../providers/tiltify')).tiltifyPlugin,
	tumblr: async () => (await import('../providers/tumblr')).tumblrPlugin,
	twitch: async () => (await import('../providers/twitch')).twitchPlugin,
	twitter: async () => (await import('../providers/twitter')).twitterPlugin,
	vk: async () => (await import('../providers/vk')).vkPlugin,
	withings: async () =>
		(await import('../providers/withings')).withingsPlugin,
	workos: async () => (await import('../providers/workos')).workOSPlugin,
	yahoo: async () => (await import('../providers/yahoo')).yahooPlugin,
	yandex: async () => (await import('../providers/yandex')).yandexPlugin,
	zoom: async () => (await import('../providers/zoom')).zoomPlugin
};

const loadConfiguredProviders = async () => {
	const plugins = await Promise.all(
		Object.entries(providerLoaders).map(async ([name, load]) => {
			try {
				return await load();
			} catch (error) {
				const reason =
					error instanceof Error ? error.message : String(error);
				console.warn(`[providers] skipping "${name}": ${reason}`);

				return null;
			}
		})
	);

	return plugins.filter((plugin): plugin is AnyElysia => plugin !== null);
};

const activeProviders = await loadConfiguredProviders();

export const providersPlugin = activeProviders.reduce<AnyElysia>(
	(app, plugin) => app.use(plugin),
	new Elysia()
);
