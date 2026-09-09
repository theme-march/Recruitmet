"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Turnstile = {
  render: (container: HTMLElement, options: { sitekey: string; action: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string;
  remove: (id: string) => void;
};

export function LoginChallenge({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  useEffect(() => {
    const api = (window as Window & { turnstile?: Turnstile }).turnstile;
    if (!ready || !sitekey || !api || !container.current) return;
    const id = api.render(container.current, {
      sitekey, action: "login", callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => { onToken(""); setFailed(true); },
    });
    return () => api.remove(id);
  }, [ready, sitekey, onToken]);
  if (!sitekey) return <p role="alert">Security verification is unavailable. Please try again later.</p>;
  return <div>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onReady={() => setReady(true)} onError={() => setFailed(true)} />
    <div ref={container} />
    {failed && <p role="alert">Unable to load security verification. Check your connection and reload this page.</p>}
  </div>;
}
