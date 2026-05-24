import {
  defineAuthConfig,
  instantiateUserSession,
  isValidProviderOption,
  resolveOAuthAuthorization,
  resolveProviderClientConfiguration,
} from "@absolutejs/auth";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { SchemaType, User } from "../../../db/schema";
import { providerData } from "../../frontend/shared/providerData";
import {
  createUser,
  getUser,
  linkUserIdentity,
  upsertDBAuthIdentityMergeRequest,
} from "../handlers/userHandlers";
import { persistLinkedProviderCallbackAuthorization } from "../linkedProviders/persistCallbackAuthorization";
import { frameworkPrefixFromOrigin } from "../utils/frameworkPrefix";
import { providersConfiguration } from "./providersConfiguration";

export const authConfig = (
  db: NeonHttpDatabase<SchemaType>,
) => defineAuthConfig<User>({
  providersConfiguration,
  onAuthorizeSuccess: ({ authProvider, authorizationUrl, authIntent }) => {
    const providerName = isValidProviderOption(authProvider)
      ? providerData[authProvider].name
      : authProvider;

    console.log(`\nRedirecting to ${providerName} authorization URL:`, {
      authIntent,
      authorizationUrl: authorizationUrl.toString(),
    });
  },
  onCallbackSuccess: async ({
    authProvider,
    providerInstance,
    session,
    tokenResponse,
    unregisteredSession,
    cookie: { user_session_id },
  }) => {
    const providerName = providerData[authProvider].name;

    console.log(
      `\nSuccesfully authorized OAuth2 with ${providerName} and got token response:`,
      {
        ...tokenResponse,
      },
    );

    return instantiateUserSession<User>({
      authProvider,
      providerInstance,
      session,
      tokenResponse,
      unregisteredSession,
      user_session_id,
      getUser: async (userIdentity) => {
        const user = await getUser({
          authProvider,
          db,
          userIdentity,
        });

        return user;
      },
      onNewUser: async (userIdentity) => {
        const user = await createUser({
          authProvider,
          db,
          userIdentity,
        });
        if (user === undefined) {
          throw new Error("Failed to create user");
        }

        return user;
      },
    });
  },
  onLinkConnector: async ({
    authClient,
    authProvider,
    currentUser,
    originUrl,
    providerInstance,
    redirect,
    tokenResponse,
  }) => {
    if (currentUser === undefined) {
      throw new Error("Connector linking requires an active signed-in user");
    }

    const resolvedProviderClientConfiguration =
      resolveProviderClientConfiguration({
        clientName: authClient,
        providerName: authProvider,
        providersConfiguration,
      });
    if (
      "error" in resolvedProviderClientConfiguration ||
      !resolvedProviderClientConfiguration.config
    ) {
      throw new Error(
        "error" in resolvedProviderClientConfiguration
          ? resolvedProviderClientConfiguration.error
          : "Client provider config not found",
      );
    }

    const linkedProviderAuthorization =
      await persistLinkedProviderCallbackAuthorization({
        authClient,
        authProvider,
        configuredScopes:
          resolvedProviderClientConfiguration.config.scope ?? [],
        db,
        ownerRefOverride: currentUser.sub,
        providerInstance,
        tokenResponse,
      });

    if (linkedProviderAuthorization.binding) {
      console.log("Persisted linked provider binding:", {
        bindingId: linkedProviderAuthorization.binding.id,
        connectorProvider:
          linkedProviderAuthorization.binding.connectorProvider,
        externalAccountId:
          linkedProviderAuthorization.binding.externalAccountId,
      });
    }

    console.log("Linked provider preserved active session:", {
      activeUserSub: currentUser.sub,
      authClient,
      authProvider,
      linkedGrantId: linkedProviderAuthorization.grant?.id,
      linkedOwnerSub: currentUser.sub,
    });

    return redirect(`${frameworkPrefixFromOrigin(originUrl)}/connectors`);
  },
  onLinkIdentity: async ({
    authProvider,
    currentUser,
    originUrl,
    providerInstance,
    redirect,
    tokenResponse,
  }) => {
    if (currentUser === undefined) {
      throw new Error("Identity linking requires an active signed-in user");
    }

    const settingsPath = `${frameworkPrefixFromOrigin(originUrl)}/settings`;

    const resolvedAuthorization = await resolveOAuthAuthorization({
      authProvider,
      providerInstance,
      tokenResponse,
    });

    const linkedIdentity = await linkUserIdentity({
      authProvider,
      db,
      userIdentity: resolvedAuthorization.userIdentity,
      userSub: currentUser.sub,
    });

    console.log("Linked auth identity preserved active session:", {
      activeUserSub: currentUser.sub,
      authProvider,
      status: linkedIdentity.status,
    });

    if (linkedIdentity.status === "already_linked") {
      return redirect(`${settingsPath}?notice=identity-already-linked`);
    }

    return redirect(settingsPath);
  },
  onLinkIdentityConflict: async ({
    conflict,
    currentUser,
    originUrl,
    redirect,
  }) => {
    if (currentUser === undefined) {
      throw new Error("Identity conflict requires an active signed-in user");
    }

    await upsertDBAuthIdentityMergeRequest({
      authProvider: conflict.authProvider,
      db,
      metadata: {
        currentUserSub: currentUser.sub,
        intent: conflict.intent,
      },
      providerSubject: conflict.providerSubject,
      sourceUserSub: conflict.existingUserAuthSub,
      targetUserSub: currentUser.sub,
    });

    console.log("Queued auth identity merge request:", conflict);

    return redirect(`${frameworkPrefixFromOrigin(originUrl)}/settings`);
  },
  onProfileSuccess: ({ authProvider, userProfile }) => {
    const providerName = isValidProviderOption(authProvider)
      ? providerData[authProvider].name
      : authProvider;

    console.log(`\nSuccessfully fetched ${providerName} profile:`, {
      ...userProfile,
    });
  },
  onRefreshSuccess: ({ authProvider, tokenResponse }) => {
    const providerName = isValidProviderOption(authProvider)
      ? providerData[authProvider].name
      : authProvider;

    console.log(
      `\nSuccessfully refreshed ${providerName} OAuth2 and recieved token response:`,
      {
        ...tokenResponse,
      },
    );
  },
  onRevocationSuccess: ({ authProvider, tokenToRevoke }) => {
    const providerName = isValidProviderOption(authProvider)
      ? providerData[authProvider].name
      : authProvider;

    console.log(`\nSuccessfully revoked ${providerName} token:`, tokenToRevoke);
  },
  onSessionCleanup({ removedSessions, removedUnregisteredSessions }) {
    console.log("\nSession cleanup performed:");
    console.log("Removed sessions:", removedSessions);
    console.log("Removed unregistered sessions:", removedUnregisteredSessions);
  },
  onSignOut: ({ authProvider, userSessionId, session }) => {
    const providerName = isValidProviderOption(authProvider)
      ? providerData[authProvider].name
      : authProvider;

    const userSession = session[userSessionId];

    if (userSession === undefined) {
      throw new Error(`User session with id ${userSessionId} not found`);
    }

    delete session[userSessionId];

    console.log(
      `\nSuccessfully signed out ${providerName} user:`,
      userSession.user,
    );
  },
  onStatus: ({ user }) => {
    if (user === null) {
      console.log("\nSuccessfully checked user is not logged in");
    } else {
      console.log(`\nSuccessfully checked user status:`, user);
    }
  },
  resolveAuthIntent: ({ currentUser, originUrl }) => {
    if (currentUser !== undefined && originUrl.includes("/settings")) {
      return "link_identity";
    }

    if (currentUser !== undefined && originUrl.includes("/connectors")) {
      return "link_connector";
    }

    return "login";
  },
});
