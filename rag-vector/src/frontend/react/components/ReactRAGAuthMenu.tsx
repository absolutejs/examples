import { useEffect, useRef, useState } from "react";

type AuthUser = {
  sub: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  primary_auth_identity_id?: string | null;
};

const loginProviders = [
  {
    href: "/oauth2/google/authorization?client=login",
    iconPath: "/assets/svg/providers/google.svg",
    key: "google",
    label: "Google",
  },
  {
    href: "/oauth2/facebook/authorization?client=login",
    iconPath: "/assets/svg/providers/meta.svg",
    key: "facebook",
    label: "Facebook",
  },
] as const;

const getAccountLabel = (user: AuthUser | null) => {
  if (!user) {
    return "Login";
  }

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.email || "Account";
};

export const ReactRAGAuthMenu = () => {
  const [isBusy, setIsBusy] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadAuthStatus = async () => {
      try {
        const response = await fetch("/oauth2/status");
        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const payload = (await response.json()) as { user?: AuthUser | null };
        if (!cancelled) {
          setUser(payload.user ?? null);
        }
      } catch (error) {
        console.error("Failed to load auth status", error);
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsBusy(false);
        }
      }
    };

    void loadAuthStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsBusy(true);

    try {
      const response = await fetch("/oauth2/signout", {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Sign out failed with status ${response.status}`);
      }

      setUser(null);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to sign out", error);
    } finally {
      setIsBusy(false);
    }
  };

  const accountLabel = getAccountLabel(user);

  return (
    <div className="demo-auth-menu" ref={containerRef}>
      <button
        className="demo-auth-trigger"
        disabled={isBusy}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        type="button"
      >
        <span className="demo-auth-trigger-text">{accountLabel}</span>
        <span aria-hidden="true" className="demo-auth-trigger-chevron">
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {isOpen ? (
        <div className="demo-auth-dropdown">
          {user ? (
            <>
              <div className="demo-auth-account-summary">
                <span className="demo-auth-kicker">AbsoluteJS account</span>
                <strong>{accountLabel}</strong>
                {user.email ? <span>{user.email}</span> : null}
              </div>
              <button
                className="demo-auth-provider-button demo-auth-provider-button-secondary"
                disabled={isBusy}
                onClick={() => void handleSignOut()}
                type="button"
              >
                <span>Sign out</span>
              </button>
            </>
          ) : (
            <>
              <div className="demo-auth-account-summary">
                <span className="demo-auth-kicker">AbsoluteJS account</span>
                <strong>Sign in to unlock linked connectors</strong>
                <span>
                  Use the same account you linked Gmail, Google Contacts, or
                  Meta bindings to in the auth example.
                </span>
              </div>
              <div className="demo-auth-provider-list">
                {loginProviders.map((provider) => (
                  <a
                    className="demo-auth-provider-button"
                    href={provider.href}
                    key={provider.key}
                  >
                    <img alt="" aria-hidden="true" src={provider.iconPath} />
                    <span>Continue with {provider.label}</span>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};
