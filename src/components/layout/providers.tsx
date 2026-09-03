"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, refetchOnWindowFocus: false },
        },
      })
  );

  useEffect(() => {
    // Suppress external browser extension content script errors & hydration mismatch from injected attributes (e.g. bis_skin_checked)
    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const errorMsg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
      if (
        errorMsg.includes("bis_skin_checked") ||
        errorMsg.includes("A tree hydrated but some attributes") ||
        errorMsg.includes("Hydration failed because") ||
        errorMsg.includes("chrome-extension://") ||
        errorMsg.includes("moz-extension://") ||
        errorMsg.includes("M_ID")
      ) {
        return;
      }
      originalConsoleError.apply(console, args);
    };

    const handleExtensionError = (event: ErrorEvent) => {
      const filename = event.filename || "";
      const message = event.message || "";
      const stack = event.error?.stack || "";
      if (
        filename.startsWith("chrome-extension://") ||
        filename.startsWith("moz-extension://") ||
        message.includes("M_ID") ||
        message.includes("bis_skin_checked") ||
        stack.includes("chrome-extension://") ||
        stack.includes("moz-extension://")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
        return true;
      }
    };

    const handleExtensionRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason || "");
      if (
        reasonStr.includes("chrome-extension://") ||
        reasonStr.includes("moz-extension://") ||
        reasonStr.includes("M_ID") ||
        reasonStr.includes("bis_skin_checked")
      ) {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
    };

    window.addEventListener("error", handleExtensionError, true);
    window.addEventListener("unhandledrejection", handleExtensionRejection, true);

    return () => {
      console.error = originalConsoleError;
      window.removeEventListener("error", handleExtensionError, true);
      window.removeEventListener("unhandledrejection", handleExtensionRejection, true);
    };
  }, []);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
