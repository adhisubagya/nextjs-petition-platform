import { ExternalLink, LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/admin-session";
import { DEMO_MODE } from "@/lib/demo";

const navItem = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors [&_svg]:size-4";

// Layout after TailAdmin: fixed-width sidebar on desktop, sticky top bar on every size.
export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background px-4 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-2 px-3 font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Megaphone className="size-4" aria-hidden />
          </span>
          Petition Admin
        </Link>
        <p className="mt-8 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">Menu</p>
        <nav className="mt-2 space-y-1">
          <span className={`${navItem} bg-accent text-accent-foreground`} aria-current="page">
            <LayoutDashboard aria-hidden /> Dashboard
          </span>
          <Link href="/" className={`${navItem} text-muted-foreground hover:bg-accent/60 hover:text-foreground`}>
            <ExternalLink aria-hidden /> View petition
          </Link>
        </nav>
        {DEMO_MODE && (
          <div className="mt-auto rounded-xl border bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">View-only demo</p>
            <p className="mt-1">Settings and pins are disabled. Data shown is sample data.</p>
          </div>
        )}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur-xl lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
            {DEMO_MODE && <Badge className="hidden sm:inline-flex">Demo Mode</Badge>}
          </div>
          <div className="flex items-center gap-1">
            <span className="mr-2 hidden truncate text-sm text-muted-foreground md:inline">{email}</span>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut aria-hidden /> Sign out
            </Button>
          </div>
        </header>
        <main className="flex-1 space-y-6 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
