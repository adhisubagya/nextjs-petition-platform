"use client";

import { useSyncExternalStore } from "react";

// Demo Mode signer state: browser tab session only, never sent to Firestore.
// Live mode will swap this for Firebase Auth (onAuthStateChanged) behind the same hook.
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
    signOut: () => write(null),
  };
}
