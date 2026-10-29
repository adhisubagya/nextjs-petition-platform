import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { getPetition } from "@/lib/petition";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const revalidate = 86400;

export default async function AdminPage() {
  return <AdminGate petition={await getPetition()} />;
}
