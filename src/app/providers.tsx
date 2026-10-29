"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60_000 } } }));
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) posthog.init(key, { api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com" });
  }, []);
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster position="bottom-center" />
    </QueryClientProvider>
  );
}
