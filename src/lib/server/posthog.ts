import "server-only";

export type Stats = { pageviews: number; visitors: number; referrers: { source: string; count: number }[]; sample: boolean };

const SAMPLE: Stats = {
  pageviews: 12840,
  visitors: 4315,
  referrers: [
    { source: "x.com", count: 1980 },
    { source: "whatsapp", count: 1422 },
    { source: "$direct", count: 610 },
    { source: "google.com", count: 233 },
  ],
  sample: true,
};

async function hogql<T>(query: string): Promise<T[]> {
  const host = process.env.POSTHOG_HOST ?? "https://us.posthog.com";
  const res = await fetch(`${host}/api/projects/${process.env.POSTHOG_PROJECT_ID}/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status}`);
  return (await res.json()).results;
}

export async function getStats(): Promise<Stats> {
  if (!process.env.POSTHOG_PERSONAL_API_KEY || !process.env.POSTHOG_PROJECT_ID) return SAMPLE;
  const since = "event = '$pageview' AND timestamp > now() - INTERVAL 7 DAY";
  const [[totals], referrers] = await Promise.all([
    hogql<[number, number]>(`SELECT count(), count(DISTINCT person_id) FROM events WHERE ${since}`),
    hogql<[string, number]>(
      `SELECT properties.$referring_domain AS d, count() AS c FROM events WHERE ${since} GROUP BY d ORDER BY c DESC LIMIT 5`,
    ),
  ]);
  return {
    pageviews: totals[0],
    visitors: totals[1],
    referrers: referrers.map(([source, count]) => ({ source: source ?? "$direct", count })),
    sample: false,
  };
}
