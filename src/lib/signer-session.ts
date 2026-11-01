"use client";

import { useSyncExternalStore } from "react";
import { DEMO_MODE } from "@/lib/demo";

// Signer UI state for this tab. In live mode the Firebase Auth session (custom token) is what the API trusts.
export type Signer = { email: string; signed: boolean };

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
  const signer: Signer | null = raw ? JSON.parse(raw) : null;
  return {
    signer,
    signIn: (email: string) => write({ email, signed: false }),
    markSigned: () => signer && write({ ...signer, signed: true }),
    signOut: () => {
      write(null);
      if (!DEMO_MODE) void import("@/lib/firebase/client").then(({ clientAuth }) => clientAuth().signOut());
    },
  };
}
