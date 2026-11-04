import type { Metadata } from "next";
import { serverEnv } from "@/lib/server/integrations";

export const revalidate = 3600;
export const metadata: Metadata = { title: "Privacy notice", description: "What we collect when you sign, why, and your choices." };

const EFFECTIVE = "November 4, 2026";

const storage = [
  ["Signer session (sessionStorage)", "Keeps you signed in while the tab is open", "Until the tab closes", "Necessary"],
  ["Sign-in token (IndexedDB, Firebase Auth)", "Proves who you are when you sign or edit", "Until you sign out", "Necessary"],
  ["Cloudflare Turnstile", "Tells people from bots", "Short-lived", "Necessary"],
  ["Theme (localStorage)", "Remembers light or dark mode", "Until you clear it", "Functional"],
];

export default async function PrivacyPage() {
  const contact = (await serverEnv()).GMAIL_USER;
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pt-16 pb-12 text-sm leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Privacy notice</h1>
        <p className="text-muted-foreground">Effective {EFFECTIVE}</p>
      </header>

      <section className="space-y-2">
        <h2>What we collect</h2>
        <ul>
          <li>Your name, email address and optional comment and photo when you sign.</li>
          <li>Your IP address, briefly, to stop spam and abuse (rate limits).</li>
          <li>Anonymous page-view statistics, kept in memory only: no analytics cookies.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>How we use it</h2>
        <ul>
          <li>To count and show your signature. Your name, comment and photo are public unless you choose to sign anonymously; your email is never shown.</li>
          <li>To deliver the petition, including signer names and comments, to the people or organisation it is addressed to.</li>
          <li>To send your sign-in code. We send no marketing email.</li>
          <li>To keep the site secure and stop fake signatures.</li>
        </ul>
        <p>We do not sell your personal information or share it for targeted advertising.</p>
      </section>

      <section className="space-y-2">
        <h2>Who processes it</h2>
        <p>
          Google Firebase (database and sign-in), Google Gmail (sign-in codes), Vercel (hosting), Upstash (rate limits), Cloudflare
          Turnstile (bot checks) and PostHog (statistics). They act on our instructions and may store data outside your country.
        </p>
      </section>

      <section className="space-y-2">
        <h2>How long we keep it</h2>
        <p>For as long as the petition is open and up to 12 months after it closes, unless you ask us to delete it sooner.</p>
      </section>

      <section className="space-y-2">
        <h2>Your choices</h2>
        <ul>
          <li>Edit or delete your signature at any time from the account menu after signing in.</li>
          <li>Ask us what we hold about you, or to correct or delete it, by emailing the contact below.</li>
          <li>We will not treat you differently for using these rights.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Children</h2>
        <p>You must be 13 or older to sign. We do not knowingly collect data from children under 13; if we learn of it, we delete it.</p>
      </section>

      <section className="space-y-2">
        <h2>Browser storage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b">
                <th className="py-2 pr-2">Item</th>
                <th className="py-2 pr-2">Purpose</th>
                <th className="py-2 pr-2">Kept</th>
                <th className="py-2">Type</th>
              </tr>
            </thead>
            <tbody>
              {storage.map(([item, purpose, kept, type]) => (
                <tr key={item} className="border-b align-top">
                  <td className="py-2 pr-2">{item}</td>
                  <td className="py-2 pr-2">{purpose}</td>
                  <td className="py-2 pr-2">{kept}</td>
                  <td className="py-2">{type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>You can clear all of these in your browser settings.</p>
      </section>

      <section className="space-y-2">
        <h2>Changes and contact</h2>
        <p>If we change this notice, we update the date above. If a breach affects your data, we will tell you as the law requires.</p>
        <p>
          Questions or requests:{" "}
          {contact ? (
            <a className="underline" href={`mailto:${contact}`}>
              {contact}
            </a>
          ) : (
            "reply to any sign-in email from this site"
          )}
          .
        </p>
      </section>
    </main>
  );
}
