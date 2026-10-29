import type { Metadata } from "next";
import { PetitionBody } from "@/components/PetitionBody";
import { ShareButtons } from "@/components/ShareButtons";
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
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{petition.title}</h1>
        <p className="text-neutral-600">{petition.description}</p>
      </header>
      <ShareButtons url={siteUrl} text={`Sign: ${petition.title}`} />
      <PetitionBody petition={petition} initialPage={firstPage} />
    </main>
  );
}
