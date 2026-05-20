import { Head } from "@absolutejs/absolute/react/components";
import { useEffect, useState } from "react";
import {
  emptyLead,
  fetchRecentContacts,
  submitLead,
} from "../../shared/browser";
import {
  FRAMEWORKS,
  FRAMEWORK_DESCRIPTIONS,
  FRAMEWORK_SNIPPETS,
  PAGE_HEADLINE,
  PAGE_SUBHEADLINE,
  PAGE_TAGLINE,
  formatRelativeTime,
  type LeadFormPayload,
  type SavedContact,
} from "../../../shared/demo";

type ReactCRMDemoProps = {
  cssPath?: string;
};

const POLL_INTERVAL_MS = 5_000;

export const ReactCRMDemo = ({ cssPath }: ReactCRMDemoProps) => {
  const [form, setForm] = useState<LeadFormPayload>(emptyLead());
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const [contacts, setContacts] = useState<SavedContact[]>([]);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const next = await fetchRecentContacts();
      if (!cancelled) setContacts(next);
    };
    void refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    const result = await submitLead(form);
    setSubmitting(false);
    if (!result.ok) {
      setStatus({ kind: "error", message: result.error ?? "Submission failed" });
      return;
    }
    setStatus({
      kind: "success",
      message: `Lead captured (${result.contact?.id ?? "unknown id"})`,
    });
    setForm(emptyLead());
    const refreshed = await fetchRecentContacts();
    setContacts(refreshed);
  };

  return (
    <div className="crm-page">
      <Head
        title="AbsoluteJS CRM Example — React"
        {...(cssPath ? { cssPath } : {})}
      />
      <div className="crm-shell">
        <header className="crm-header">
          <div className="crm-header__brand">
            <strong>@absolutejs/crm</strong>
            <span>{PAGE_TAGLINE}</span>
          </div>
          <nav className="crm-nav" aria-label="Frameworks">
            {FRAMEWORKS.map((framework) => (
              <a
                key={framework.id}
                href={framework.href}
                className={framework.id === "react" ? "is-active" : ""}
              >
                {framework.label}
              </a>
            ))}
          </nav>
        </header>
        <section className="crm-hero">
          <h1>{PAGE_HEADLINE}</h1>
          <p>{PAGE_SUBHEADLINE}</p>
          <p style={{ marginTop: "0.75rem" }}>
            <strong>React: </strong>
            {FRAMEWORK_DESCRIPTIONS.react}
          </p>
        </section>
        <div className="crm-grid">
          <div className="crm-card">
            <h2>Lead capture form</h2>
            <form className="crm-form" onSubmit={onSubmit}>
              <div className="crm-form__row">
                <label>
                  First name
                  <input
                    name="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Last name
                  <input
                    name="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    required
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </label>
              <div className="crm-form__row">
                <label>
                  Phone
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Company
                  <input
                    name="company"
                    value={form.company}
                    onChange={(e) =>
                      setForm({ ...form, company: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                Notes
                <textarea
                  name="notes"
                  value={form.notes ?? ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </label>
              <button
                className="crm-form__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Capture lead"}
              </button>
              {status ? (
                <div
                  className={`crm-status is-${status.kind}`}
                  role="status"
                >
                  {status.message}
                </div>
              ) : null}
            </form>
            <pre className="crm-snippet">{FRAMEWORK_SNIPPETS.react}</pre>
          </div>
          <div className="crm-card">
            <h2>Recent contacts</h2>
            <div className="crm-contacts">
              {contacts.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>
                  No leads yet — submit the form to see one land here.
                </p>
              ) : (
                contacts.map((contact) => (
                  <article key={contact.id} className="crm-contact">
                    <span className="crm-contact__time">
                      {formatRelativeTime(contact.createdAt)}
                    </span>
                    <div className="crm-contact__name">
                      {(contact.firstName ?? "") +
                        (contact.lastName ? ` ${contact.lastName}` : "")}
                      {!contact.firstName && !contact.lastName ? "(unnamed)" : null}
                    </div>
                    <div className="crm-contact__meta">
                      {contact.email ?? "—"}
                      {contact.phone ? ` · ${contact.phone}` : ""}
                      {contact.company ? ` · ${contact.company}` : ""}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
        <footer className="crm-footer">
          Backed by `@absolutejs/crm` runtime — same backend for all 6 framework
          pages.
        </footer>
      </div>
    </div>
  );
};
