import { installExtensionErrorGuard } from "./lib/browser-extension-errors";

// Run before hydration, not in a component effect after the overlay starts.
// Never change production error reporting or patch console.error.
if (process.env.NODE_ENV === "development") {
  const browser = window as Window & { __orbitExtensionErrorCleanup?: () => void };
  browser.__orbitExtensionErrorCleanup?.();
  browser.__orbitExtensionErrorCleanup = installExtensionErrorGuard(browser);
}
