/**
 * Drive the REAL Discord web client (in the visible, signed-in Chrome) to open
 * a server and connect to a voice channel via bun-native CDP — so the inline
 * demo shows the actual Discord app while the bots (`discord-scene.ts`) join the
 * same channel and talk. Clicking a voice-channel row connects you; Discord's
 * rows are keyed by `data-list-item-id="channels___<id>"`. Mic permission is
 * granted up front so the first connect doesn't stall on a prompt (we only need
 * to *hear* the bots; no real mic exists in this Chrome).
 */

type CdpLike = {
	send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
	evaluate: <T>(fnSource: string, arg?: unknown) => Promise<T>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type DiscordViewOptions = {
	guildId: string;
	voiceChannelId: string;
	textChannelId?: string;
	/** Browser-level audioCapture grant target (defaults to discord.com). */
	origin?: string;
};

/** Navigate to the guild (text channel if given) and connect to voice. */
export const openDiscordVoice = async (
	browser: CdpLike,
	options: DiscordViewOptions,
): Promise<{ connected: boolean }> => {
	const { guildId, voiceChannelId, textChannelId } = options;
	await browser
		.send("Browser.grantPermissions", {
			origin: options.origin ?? "https://discord.com",
			permissions: ["audioCapture"],
		})
		.catch(() => undefined);

	const url = `https://discord.com/channels/${guildId}${textChannelId ? `/${textChannelId}` : ""}`;
	await browser.send("Page.navigate", { url });
	// Discord's SPA needs a beat to boot and render the channel sidebar.
	const ready = Date.now() + 20000;
	for (;;) {
		const hasSidebar = await browser
			.evaluate<boolean>(
				`() => !!document.querySelector('[data-list-item-id*="${voiceChannelId}"]')`,
			)
			.catch(() => false);
		if (hasSidebar) break;
		if (Date.now() > ready) return { connected: false };
		await sleep(600);
	}

	await browser.evaluate(
		`() => { const a = document.querySelector('a[data-list-item-id="channels___${voiceChannelId}"]') || document.querySelector('[data-list-item-id*="${voiceChannelId}"]'); if (!a) return; const r = a.getBoundingClientRect(); const o = { bubbles: true, cancelable: true, view: window, clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 }; a.dispatchEvent(new MouseEvent('mousedown', o)); a.dispatchEvent(new MouseEvent('mouseup', o)); a.dispatchEvent(new MouseEvent('click', o)); }`,
	);

	const connectedDeadline = Date.now() + 12000;
	for (;;) {
		const connected = await browser
			.evaluate<boolean>(
				`() => !!document.querySelector('[aria-label*="Disconnect"]')`,
			)
			.catch(() => false);
		if (connected) return { connected: true };
		if (Date.now() > connectedDeadline) return { connected: false };
		await sleep(500);
	}
};

/** Disconnect from the current voice channel. */
export const leaveDiscordVoice = async (browser: CdpLike): Promise<void> => {
	await browser
		.evaluate(
			`() => { const b = document.querySelector('[aria-label*="Disconnect"]'); b && b.click(); }`,
		)
		.catch(() => undefined);
};
