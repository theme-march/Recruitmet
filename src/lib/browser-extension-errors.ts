const extensionUrl = /^(?:chrome|moz|safari-web)-extension:\/\//;

function stackOf(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  try {
    const stack = (error as { stack?: unknown }).stack;
    return typeof stack === "string" ? stack : "";
  } catch { return ""; }
}

export function isExtensionError(filename: string, error: unknown): boolean {
  // A real script source is authoritative. Never match error message keywords:
  // our own code can throw M_ID errors or genuine hydration errors too.
  if (filename) return extensionUrl.test(filename);
  const frames = stackOf(error).split("\n").filter(line => /^\s*at\s/.test(line) || /^[^\s]*@\S/.test(line));
  // Promise rejections may only supply a stack. Require every frame to point
  // to an extension; mixed app/extension stacks stay visible for debugging.
  return frames.length > 0 && frames.every(frame =>
    /(?:\bat\s+(?:.*?\()?|@)(?:chrome|moz|safari-web)-extension:\/\/[^\s)]+\)?$/.test(frame.trim())
  );
}

export function installExtensionErrorGuard(target: Window): () => void {
  let warned = false;
  const report = (event: Event, error: unknown) => {
    // Keep the browser's default console reporting. Only stop the development
    // overlay from treating a confirmed extension fault as an application crash.
    event.stopImmediatePropagation();
    if (!warned) {
      warned = true;
      console.warn("[ORBIT] A browser extension failed. Disable it for this site or update it. Application error reporting remains enabled.", error);
    }
  };
  const onError = (event: ErrorEvent) => {
    if (isExtensionError(event.filename, event.error)) report(event, event.error);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    if (isExtensionError("", event.reason)) report(event, event.reason);
  };
  target.addEventListener("error", onError, { capture: true });
  target.addEventListener("unhandledrejection", onRejection, { capture: true });
  return () => {
    target.removeEventListener("error", onError, { capture: true });
    target.removeEventListener("unhandledrejection", onRejection, { capture: true });
  };
}
