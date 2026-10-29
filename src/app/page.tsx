import type { Metadata } from "next";
import { PetitionBody } from "@/components/PetitionBody";
import { ShareButtons } from "@/components/ShareButtons";
import { SiteHeader } from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { DEMO_MODE } from "@/lib/demo";
import { getComments, getPetition } from "@/lib/petition";

// Re-render from Firestore at most once a day; everything else is served from the edge cache.
export const revalidate = 86400;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await getPetition();
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: "/" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PetitionPage() {
  const [petition, firstPage] = await Promise.all([getPetition(), getComments()]);
  return (
    <>
      <SiteHeader />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--foreground)_12%,transparent),transparent)]"
      />
      <main className="mx-auto max-w-5xl px-4 pt-16 pb-12">
        <section className="mx-auto max-w-2xl animate-fade-up text-center">
          <Badge className="mb-5">
            <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
            {DEMO_MODE ? "Live demo · nothing is saved" : "Open for signatures"}
          </Badge>
          <h1 className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-4xl font-bold tracking-tight text-balance text-transparent sm:text-6xl">
            {petition.title}
          </h1>
          <p className="mt-5 text-lg text-pretty text-muted-foreground">{petition.description}</p>
          <div className="mt-8 flex justify-center">
            <ShareButtons url={siteUrl} text={`Sign: ${petition.title}`} />
          </div>
        </section>
        <PetitionBody petition={petition} initialPage={firstPage} />
      </main>
    </>
  );
}
