import "server-only";
import { defaultStore, type Store } from "@/lib/server/kv";

export type Mail = { to: string; subject: string; text: string; html: string };

type Env = Record<string, string | undefined>;
type Provider = {
  name: string;
  /** Free-plan daily cap; we stop at 95% so a provider's own counting lag never bounces a code. */
  dailyCap: number;
  configured(env: Env): boolean;
  request(mail: Mail, env: Env): { url: string; init: RequestInit };
};

const json = (headers: Record<string, string>, body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json", ...headers },
  body: JSON.stringify(body),
});
const fromName = (env: Env) => env.EMAIL_FROM_NAME ?? "Petition";

// Brevo first (largest free cap, 300/day), then Resend (100/day), then Mailjet (200/day, brands free mail).
export const PROVIDERS: Provider[] = [
  {
    name: "brevo",
    dailyCap: 300,
    configured: (env) => Boolean(env.BREVO_API_KEY),
    request: (m, env) => ({
      url: "https://api.brevo.com/v3/smtp/email",
      init: json({ "api-key": env.BREVO_API_KEY! }, {
        sender: { email: env.EMAIL_FROM, name: fromName(env) },
        to: [{ email: m.to }],
        subject: m.subject,
        textContent: m.text,
        htmlContent: m.html,
      }),
    }),
  },
  {
    name: "resend",
    dailyCap: 100,
    configured: (env) => Boolean(env.RESEND_API_KEY),
    request: (m, env) => ({
      url: "https://api.resend.com/emails",
      init: json({ Authorization: `Bearer ${env.RESEND_API_KEY}` }, {
        from: `${fromName(env)} <${env.EMAIL_FROM}>`,
        to: [m.to],
        subject: m.subject,
        text: m.text,
        html: m.html,
      }),
    }),
  },
  {
    name: "mailjet",
    dailyCap: 200,
    configured: (env) => Boolean(env.MAILJET_API_KEY && env.MAILJET_SECRET_KEY),
    request: (m, env) => ({
      url: "https://api.mailjet.com/v3.1/send",
      init: json({ Authorization: `Basic ${btoa(`${env.MAILJET_API_KEY}:${env.MAILJET_SECRET_KEY}`)}` }, {
        Messages: [{ From: { Email: env.EMAIL_FROM, Name: fromName(env) }, To: [{ Email: m.to }], Subject: m.subject, TextPart: m.text, HTMLPart: m.html }],
      }),
    }),
  },
];

const COUNTER_TTL = 48 * 3600;
// Free quotas reset daily; counting by UTC day is close enough with the 5% margin.
export const quotaKey = (name: string, now: Date) => `mail:${name}:${now.toISOString().slice(0, 10)}`;

/** The address itself was refused: another provider would refuse it too, so don't fall through. */
export class EmailRejectedError extends Error {}
export class EmailUnavailableError extends Error {}

type Deps = { store?: Store; fetch?: typeof fetch; env?: Env; now?: Date };

/**
 * Sends through the first configured provider with free quota left today and returns its name.
 * 429 marks that provider spent for the day; 5xx, auth and network errors move on at once.
 */
export async function sendEmail(mail: Mail, deps: Deps = {}): Promise<string> {
  const { store = defaultStore, fetch: doFetch = fetch, env = process.env, now = new Date() } = deps;
  if (!env.EMAIL_FROM) throw new EmailUnavailableError("EMAIL_FROM is not set");

  for (const p of PROVIDERS) {
    if (!p.configured(env)) continue;
    const key = quotaKey(p.name, now);
    const limit = Math.floor(p.dailyCap * 0.95);
    if (Number((await store.get(key)) ?? 0) >= limit) continue;

    const { url, init } = p.request(mail, env);
    const res = await doFetch(url, { ...init, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (res?.ok) {
      await store.incr(key, COUNTER_TTL);
      return p.name;
    }
    if (res && (res.status === 400 || res.status === 422)) {
      throw new EmailRejectedError(`${p.name} rejected the message (${res.status})`);
    }
    if (res?.status === 429) await store.set(key, String(limit), COUNTER_TTL);
    console.warn(`email: ${p.name} failed (${res?.status ?? "network"}), trying next provider`);
  }
  throw new EmailUnavailableError("No email provider has quota left today");
}

export function codeEmail(to: string, code: string): Mail {
  const note = "It expires in 10 minutes. If you did not ask for it, ignore this email.";
  return {
    to,
    subject: `${code} is your sign-in code`,
    text: `Your sign-in code is ${code}. ${note}`,
    html: `<p>Your sign-in code is</p><p style="font-size:28px;font-weight:600;letter-spacing:6px">${code}</p><p>${note}</p>`,
  };
}
