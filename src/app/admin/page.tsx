import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getPetition } from "@/lib/petition";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const revalidate = 86400;

export default async function AdminPage() {
  return (
    <>
      <div className="fixed top-3 right-3 z-50">
        <ThemeToggle />
      </div>
      <AdminGate petition={await getPetition()} />
    </>
  );
}
