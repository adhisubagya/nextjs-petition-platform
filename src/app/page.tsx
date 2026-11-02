import { CampaignPage, campaignMetadata } from "@/components/CampaignPage";
import { petitionId } from "@/lib/firebase/admin";

// Re-render from Firestore at most once a day; everything else is served from the edge cache.
export const revalidate = 86400;

// Shows the default campaign until the landing page lists them all.
export const generateMetadata = () => campaignMetadata(petitionId(), "/");

export default function Home() {
  return <CampaignPage slug={petitionId()} path="/" />;
}
