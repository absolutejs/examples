import { env } from 'process';
import { Elysia, t } from 'elysia';
import {
	createOAuth2Client,
	extractPropFromIdentity,
	generateState
} from 'citra';
import { COOKIE_DURATION } from '../../shared/constants';

if (
	!env.WITHINGS_CLIENT_ID ||
	!env.WITHINGS_CLIENT_SECRET ||
	!env.WITHINGS_REDIRECT_URI
) {
	throw new Error('Withings OAuth2 credentials are not set in .env file');
}

const withingsOAuth2Client = await createOAuth2Client('withings', {
	clientId: env.WITHINGS_CLIENT_ID,
	clientSecret: env.WITHINGS_CLIENT_SECRET,
	redirectUri: env.WITHINGS_REDIRECT_URI
});

export const withingsPlugin = new Elysia()
	.get(
		'/oauth2/withings/authorization',
		async ({ redirect, status, cookie: { state } }) => {
			if (state === undefined)
				return status('Bad Request', 'Cookies are missing');

			const currentState = generateState();
			const authorizationUrl =
				await withingsOAuth2Client.createAuthorizationUrl({
					scope: ['user.info'],
					state: currentState
				});

			state.set({
				httpOnly: true,
				maxAge: COOKIE_DURATION,
				path: '/',
				sameSite: 'lax',
				secure: true,
				value: currentState
			});

			return redirect(authorizationUrl.toString());
		}
	)
	.get(
		'/oauth2/withings/callback',
		async ({
			status,
			redirect,
			cookie: { state: stored_state },
			query: { code, state: callback_state }
		}) => {
			if (stored_state === undefined)
				return status('Bad Request', 'Cookies are missing');

			if (code === undefined)
				return status('Bad Request', 'Code is missing in query');

			if (callback_state !== stored_state.value) {
				return status(
					'Bad Request',
					`Invalid state mismatch: expected "${stored_state.value}", got "${callback_state}"`
				);
			}

			stored_state.remove();

			try {
				const oauthResponse =
					await withingsOAuth2Client.validateAuthorizationCode({
						code
					});
				const withingsUserId = extractPropFromIdentity(
					oauthResponse,
					['body', 'userid'],
					'number'
				);
				console.log('\nWithings authorized:', oauthResponse);
				console.log(
					'\nSave this Withings user ID for revocation:',
					withingsUserId
				);
			} catch (err) {
				if (err instanceof Error) {
					return status(
						'Internal Server Error',
						`Failed to validate authorization code: ${err.message}`
					);
				}

				return status(
					'Internal Server Error',
					`Unexpected error: ${err}`
				);
			}

			return redirect('/');
		}
	)
	.post(
		'/oauth2/withings/tokens',
		async ({ status, body: { refresh_token } }) => {
			try {
				const oauthResponse =
					await withingsOAuth2Client.refreshAccessToken(
						refresh_token
					);
				console.log('\nWithings token refreshed:', oauthResponse);

				return new Response(JSON.stringify(oauthResponse), {
					headers: {
						'Content-Type': 'application/json'
					}
				});
			} catch (err) {
				if (err instanceof Error) {
					return status(
						'Internal Server Error',
						`Failed to refresh access token: ${err.message}`
					);
				}

				return status(
					'Internal Server Error',
					`Unexpected error: ${err}`
				);
			}
		},
		{
			body: t.Object({
				refresh_token: t.String()
			})
		}
	)
	.delete(
		'/oauth2/withings/revocation',
		async ({ status, query: { token_to_revoke } }) => {
			if (!token_to_revoke)
				return status(
					'Bad Request',
					'Token to revoke is required in query parameters'
				);

			const withingsUserId = Number(token_to_revoke);
			if (!Number.isSafeInteger(withingsUserId) || withingsUserId <= 0)
				return status(
					'Bad Request',
					'Withings revocation requires the positive numeric user ID returned by the token response'
				);

			try {
				await withingsOAuth2Client.revokeToken(withingsUserId);
				console.log('\nWithings user revoked:', withingsUserId);

				return new Response(
					`Withings user ${withingsUserId} revoked successfully`,
					{
						headers: {
							'Content-Type': 'text/plain'
						}
					}
				);
			} catch (err) {
				if (err instanceof Error) {
					return status(
						'Internal Server Error',
						`Failed to revoke token: ${err.message}`
					);
				}

				return status(
					'Internal Server Error',
					`Unexpected error: ${err}`
				);
			}
		}
	);
