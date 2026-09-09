"use client";
import { useRef } from "react";

// A failed/uncertain request retains its key. A successful payment starts a new
// operation; double clicks share the in-flight promise rather than charging twice.
export function usePaymentRequest() {
  const pending = useRef<{ signature: string; key: string; request?: Promise<Response> } | null>(null);
  return (url: string, init: RequestInit) => {
    const signature = url + String(init.body);
    if (pending.current?.request) {
      if (pending.current.signature !== signature) return Promise.reject(new Error("Wait for the current payment to finish."));
      return pending.current.request.then(response => response.clone());
    }
    const entry = pending.current?.signature === signature ? pending.current : { signature, key: crypto.randomUUID() };
    pending.current = entry;
    const headers = new Headers(init.headers);
    headers.set("Idempotency-Key", entry.key);
    entry.request = fetch(url, { ...init, headers }).then(response => {
      if (response.ok) pending.current = null;
      return response;
    }).finally(() => { entry.request = undefined; });
    return entry.request.then(response => response.clone());
  };
}
