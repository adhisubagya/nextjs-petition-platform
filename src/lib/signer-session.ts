"use client";

import { useSyncExternalStore } from "react";
import { DEMO_MODE } from "@/lib/demo";

// Signer UI state for this tab. In live mode the Firebase Auth session (custom token) is what the API trusts.
// `signed` lists campaign slugs signed in this tab, so another campaign still shows its form.
export type Signer = { email: string; signed: string[] };

const KEY = "signer";
const EVENT = "signer-change";

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function write(value: Signer | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Storage blocked (private mode): the session just won't survive a reload.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useSigner() {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  const parsed: Signer | null = raw ? JSON.parse(raw) : null;
  const signer = parsed && { ...parsed, signed: Array.isArray(parsed.signed) ? parsed.signed : [] };
  return {
    signer,
    signIn: (email: string) => write({ email, signed: [] }),
    markSigned: (slug: string) => signer && write({ ...signer, signed: [...signer.signed, slug] }),
    signOut: () => {
      write(null);
      if (!DEMO_MODE) void import("@/lib/firebase/client").then(({ clientAuth }) => clientAuth().signOut());
    },
  };
}
