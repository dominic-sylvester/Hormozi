import { useEveAgent } from "eve/react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { MessageBubble } from "./MessageBubble";

const STARTER_PROMPTS = [
  "Set up my company profile",
  "Launch a new offer end-to-end",
  "Audit my lead generation",
  "Run a weekly operating review",
  "Write 5 hooks for my core offer",
] as const;

function buildWebsiteOnboardingMessage(url: string): string {
  const trimmed = url.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return `Research my company from ${withProtocol} and onboard my profile. Present a draft summary and ask me to confirm before saving.`;
}

export function AdvisorChat() {
  const agent = useEveAgent();
  const [draft, setDraft] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = agent.status === "submitted" || agent.status === "streaming";

  useEffect(() => {
    const node = scrollRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [agent.data.messages, agent.status]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isBusy) {
      return;
    }

    setDraft("");
    await agent.send({ message: trimmed });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(draft);
  }

  async function onWebsiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!websiteUrl.trim()) {
      return;
    }
    await sendMessage(buildWebsiteOnboardingMessage(websiteUrl));
    setWebsiteUrl("");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Acquisition.com playbook company</p>
          <h1>Hormozi Advisor</h1>
          <p className="subtitle">
            CEO routing, department heads, and 15 playbook specialists — powered by Eve.
          </p>
        </div>
        <div className="header-actions">
          <span className={`status-pill status-${agent.status}`}>{agent.status}</span>
          <button type="button" className="ghost-button" onClick={() => agent.reset()}>
            New session
          </button>
        </div>
      </header>

      <main className="chat-panel">
        <div ref={scrollRef} className="message-list">
          {agent.data.messages.length === 0 ? (
            <section className="empty-state">
              <h2>Where should we start?</h2>
              <p>
                Ask about offers, leads, pricing, retention, or run a full company workflow.
                On first visit, onboard manually or paste your company website below for research-backed setup.
              </p>
              <form className="onboarding-url-form" onSubmit={(event) => void onWebsiteSubmit(event)}>
                <label htmlFor="company-website">Existing company website</label>
                <div className="onboarding-url-row">
                  <input
                    id="company-website"
                    type="url"
                    inputMode="url"
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    disabled={isBusy}
                    onChange={(event) => setWebsiteUrl(event.target.value)}
                  />
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={isBusy || websiteUrl.trim().length === 0}
                  >
                    Research & onboard
                  </button>
                </div>
              </form>
              <div className="starter-grid">
                {STARTER_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="starter-button"
                    disabled={isBusy}
                    onClick={() => void sendMessage(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>
          ) : (
            agent.data.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
        </div>

        {agent.error ? (
          <div className="error-banner" role="alert">
            {agent.error.message}
          </div>
        ) : null}

        <form className="composer" onSubmit={(event) => void onSubmit(event)}>
          <textarea
            name="message"
            rows={3}
            value={draft}
            placeholder="Ask the CEO to route work across growth, monetization, sales, success, or brand…"
            disabled={isBusy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(draft);
              }
            }}
          />
          <div className="composer-actions">
            {isBusy ? (
              <button type="button" className="secondary-button" onClick={() => agent.stop()}>
                Stop stream
              </button>
            ) : null}
            <button type="submit" className="primary-button" disabled={isBusy || draft.trim().length === 0}>
              Send
            </button>
          </div>
        </form>
      </main>

      <footer className="app-footer">
        <p>
          Run <code>npm run dev</code> in <code>hormozi-advisor</code> for the Eve agent, then{" "}
          <code>npm run dev:web</code> for this UI. Requests proxy to <code>/eve/v1</code>.
        </p>
      </footer>
    </div>
  );
}
